<?php

namespace Opace\ContentIntegrity\Analysis;

use Opace\ContentIntegrity\Core\Settings;
use WP_Error;

defined( 'ABSPATH' ) || exit;

final class DeterministicAnalyser {
	public function analyse( array $request ) {
		if ( '1.0' !== ( isset( $request['schema_version'] ) ? $request['schema_version'] : '' ) || 0 !== strpos( (string) ( isset( $request['contract_version'] ) ? $request['contract_version'] : '' ), '1.' ) ) {
			return new WP_Error( 'contract_incompatible', __( 'The request contract is incompatible with this plugin.', 'opace-ai-content-integrity' ), array( 'status' => 400 ) );
		}
		$allowed_routes = isset( $request['privacy']['allowed_routes'] ) && is_array( $request['privacy']['allowed_routes'] ) ? $request['privacy']['allowed_routes'] : array();
		if ( ! in_array( 'wordpress_local', $allowed_routes, true ) ) {
			return new WP_Error( 'consent_required', __( 'This request does not permit the WordPress local inspection route.', 'opace-ai-content-integrity' ), array( 'status' => 409 ) );
		}
		$source = isset( $request['source'] ) && is_array( $request['source'] ) ? $request['source'] : array();
		$text   = isset( $source['content'] ) && is_string( $source['content'] ) ? $source['content'] : '';
		if ( '' === trim( $text ) ) {
			return new WP_Error( 'invalid_request', __( 'Add text to inspect.', 'opace-ai-content-integrity' ), array( 'status' => 400 ) );
		}
		$settings = Settings::get();
		if ( mb_strlen( $text, 'UTF-8' ) > $settings['max_chars'] ) {
			return new WP_Error( 'request_too_large', __( 'The text exceeds this site’s inspection limit.', 'opace-ai-content-integrity' ), array( 'status' => 413 ) );
		}
		if ( ! mb_check_encoding( $text, 'UTF-8' ) ) {
			return new WP_Error( 'invalid_request', __( 'The text is not valid UTF-8.', 'opace-ai-content-integrity' ), array( 'status' => 400 ) );
		}

		$started      = gmdate( 'c' );
		$hash         = 'sha256:' . hash( 'sha256', $text );
		$content_type = isset( $source['content_type'] ) ? $source['content_type'] : 'plain_text';
		$visible      = $this->visible_text( $text, $content_type );
		$normal       = class_exists( 'Normalizer' ) ? \Normalizer::normalize( $visible, \Normalizer::FORM_C ) : $visible;
		$unicode      = array_merge( ( new UnicodeAnalyser() )->inspect( $text ), ( new HomoglyphAnalyser() )->inspect( $text ) );
		$patterns     = ( new PatternAnalyser() )->inspect( $visible );
		$protected    = ( new ProtectedSpanExtractor() )->extract( $text, $hash );
		$checks       = isset( $request['checks'] ) && is_array( $request['checks'] ) ? $request['checks'] : array( 'unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic' );
		$methods      = array();

		foreach ( $checks as $check ) {
			if ( 0 === strpos( $check, 'unicode.' ) ) {
				$evidence  = array_map(
					static function ( $finding ) {
						return array_merge( array( 'type' => 'unicode_finding' ), $finding );
					},
					$unicode
				);
				$methods[] = $this->method( $check, 'unicode', 'Opace deterministic Unicode inspection', 'unicode:2026.08.1', empty( $unicode ) ? 'pass' : 'attention', $started, $evidence, array( 'Unicode controls can be legitimate in multilingual text.', 'Authorship cannot be proved from this check.' ) );
			} elseif ( 'style.patterns' === $check ) {
				$evidence  = array_map(
					static function ( $finding ) {
						return array(
							'type'    => 'pattern_finding',
							'rule_id' => $finding['rule_id'],
							'span'    => $finding['span'],
						);
					},
					$patterns
				);
				$methods[] = $this->method( $check, 'pattern', 'Opace writing-pattern rules', PatternAnalyser::VERSION, empty( $patterns ) ? 'pass' : 'attention', $started, $evidence, array( 'Writing patterns are editorial prompts, not detector or watermark evidence.', 'Authorship cannot be proved from this check.' ) );
			} elseif ( 'watermark.anthropic' === $check ) {
				$item                   = $this->method( $check, 'watermark', 'Anthropic official text-watermark detector', 'unavailable-2026-08-26', 'unsupported', $started, array(), array( 'No official detector call was available. Local style or public SynthID tests are not substitutes.' ) );
				$item['availability']   = 'not_available';
				$item['native_outcome'] = 'not_available';
				$item['limitations']    = array( 'No official detector call was available. Local style or public SynthID tests are not substitutes.' );
				$methods[]              = $item;
			} else {
				$methods[] = $this->method( sanitize_key( $check ), 'detector', (string) $check, 'unsupported/1', 'unsupported', $started, array(), array( 'This requested method is not implemented in the deterministic WordPress core.' ) );
			}
		}

		$summary = array_fill_keys( array( 'pass', 'attention', 'fail', 'inconclusive', 'unsupported', 'not_configured', 'not_run', 'error' ), 0 );
		foreach ( $methods as $method ) {
			++$summary[ $method['status'] ];
		}

		return array(
			'schema_version'   => '1.0',
			'contract_version' => '1.0.0',
			'request_id'       => sanitize_text_field( isset( $request['request_id'] ) ? $request['request_id'] : wp_generate_uuid4() ),
			'analysis_id'      => 'analysis_' . substr( hash( 'sha256', $hash . microtime( true ) ), 0, 24 ),
			'source'           => array(
				'content_hash'    => $hash,
				'normalised_hash' => 'sha256:' . hash( 'sha256', $normal ),
				'content_type'    => in_array( $content_type, array( 'plain_text', 'html', 'markdown' ), true ) ? $content_type : 'plain_text',
				'language'        => sanitize_text_field( isset( $source['language'] ) ? $source['language'] : 'und' ),
				'word_count'      => $this->word_count( $visible ),
			),
			'protected_spans'  => $protected,
			'pattern_findings' => $patterns,
			'unicode_findings' => $unicode,
			'methods'          => $methods,
			'summary'          => $summary,
			'limitations'      => array( 'Authorship cannot be proved from these checks.' ),
			'started_at'       => $started,
			'completed_at'     => gmdate( 'c' ),
		);
	}

	private function method( $id, $category, $provider, $version, $status, $started, array $evidence, array $limitations ) {
		return array(
			'id'                 => $id,
			'category'           => $category,
			'provider_or_method' => $provider,
			'version'            => $version,
			'status'             => $status,
			'score'              => null,
			'threshold'          => null,
			'segments'           => array(),
			'evidence'           => $evidence,
			'limitations'        => $limitations,
			'started_at'         => $started,
			'completed_at'       => gmdate( 'c' ),
			'privacy_route'      => 'wordpress_local',
		);
	}

	private function visible_text( $text, $type ) {
		if ( 'plain_text' === $type ) {
			return $text;
		}
		if ( 'markdown' === $type ) {
			$text = preg_replace_callback(
				'/!?(\[([^\]]*)\])\(([^)]+)\)/u',
				static function ( $matches ) {
					return $matches[2];
				},
				$text
			);
			return preg_replace( '/(^|\s)[*_]{1,3}([^*_]+)[*_]{1,3}/u', '$1$2', $text );
		}

		$safe = preg_replace_callback(
			'/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->/iu',
			static function ( $matches ) {
				return str_repeat( ' ', TextOffsets::utf16_length( $matches[0] ) );
			},
			$text
		);
		preg_match_all( '/<[^>]*>|&(?:#x?[0-9a-f]+|[a-z]+);/iu', $safe, $tokens, PREG_OFFSET_CAPTURE );
		$visible = '';
		$cursor  = 0;
		foreach ( $tokens[0] as $token ) {
			$visible .= substr( $safe, $cursor, $token[1] - $cursor );
			if ( preg_match( '/^<(br|\/?(?:p|div|section|article|li|h[1-6]|blockquote|tr))\b/i', $token[0] ) ) {
				$visible .= "\n";
			} elseif ( '&' === $token[0][0] ) {
				$visible .= $this->decode_entity( $token[0] );
			}
			$cursor = $token[1] + strlen( $token[0] );
		}
		return $visible . substr( $safe, $cursor );
	}

	private function decode_entity( $raw ) {
		$named = array(
			'&amp;'  => '&',
			'&lt;'   => '<',
			'&gt;'   => '>',
			'&quot;' => '"',
			'&apos;' => "'",
			'&nbsp;' => "\u{00A0}",
		);
		$key   = strtolower( $raw );
		if ( isset( $named[ $key ] ) ) {
			return $named[ $key ];
		}
		if ( ! preg_match( '/^&#(x?)([0-9a-f]+);$/i', $raw, $match ) ) {
			return $raw;
		}
		$value = 'x' === strtolower( $match[1] ) ? hexdec( $match[2] ) : (int) $match[2];
		return $value >= 0 && $value <= 0x10FFFF && ! ( $value >= 0xD800 && $value <= 0xDFFF ) ? mb_chr( $value, 'UTF-8' ) : $raw;
	}

	private function word_count( $text ) {
		if ( ! preg_match_all( '/\S+/u', trim( $text ), $words ) ) {
			return 0;
		}
		return count( $words[0] );
	}
}
