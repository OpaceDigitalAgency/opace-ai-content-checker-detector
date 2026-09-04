<?php

namespace Opace\ContentIntegrity\Contracts;

use Opace\ContentIntegrity\Analysis\TextOffsets;
use Throwable;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/** WordPress consumer checks layered on top of the canonical JSON Schema. */
final class CanonicalCheckerResultValidator {
	const SCHEMA = 'checker-result.schema.json';

	private $validator;

	public function __construct( ?ContractValidator $validator = null ) {
		$this->validator = $validator ? $validator : new ContractValidator( OPACE_CONTENT_INTEGRITY_DIR . 'schemas' );
	}

	public function validate( $payload, $text = null ) {
		if ( ! is_array( $payload ) ) {
			return $this->invalid();
		}

		try {
			$object  = json_decode( wp_json_encode( $payload ) );
			$outcome = $this->validator->validate( $object, self::SCHEMA );
		} catch ( Throwable $error ) {
			return $this->invalid();
		}

		if ( ! $outcome->isValid() || ! $this->consistent( $payload, is_string( $text ) ? $text : null ) ) {
			return $this->invalid();
		}

		return true;
	}

	private function consistent( array $payload, $text ) {
		$source   = $payload['source'];
		$route    = $payload['route'];
		$axes     = $payload['axes'];
		$ai       = $axes['ai_pattern'];
		$sections = $payload['sections'];

		if ( count( $sections ) !== $source['section_count'] ) {
			return false;
		}

		if ( 'assessed' !== $ai['assessment_status'] ) {
			return empty( $sections )
				&& null === $ai['raw_score']
				&& null === $ai['raw_margin']
				&& null === $ai['display_score']
				&& null === $ai['level'];
		}

		if ( ! $this->current_wordpress_model_route( $route, $ai, $payload['abuse_controls'] ) || empty( $sections ) || 'full_checker' !== $payload['profile'] ) {
			return false;
		}

		// WordPress already holds the local source. The external response must not echo it.
		if ( true !== $payload['exports']['report']['available'] || true !== $payload['exports']['report']['complete_evidence'] || false !== $payload['contains_content'] ) {
			return false;
		}

		$source_length = $text ? TextOffsets::utf16_length( $text ) : $source['character_count'];
		if ( $text && ( 'sha256:' . hash( 'sha256', $text ) !== $source['content_hash'] || $source_length !== $source['character_count'] ) ) {
			return false;
		}

		$previous_end = 0;
		$strongest    = null;
		$score_texts  = array();
		$margins      = array();
		foreach ( $sections as $position => $section ) {
			if ( $section['index'] !== $position || $section['start_utf16'] < $previous_end || $section['end_utf16'] <= $section['start_utf16'] || $section['end_utf16'] > $source_length ) {
				return false;
			}
			if ( isset( $section['passage'] ) ) {
				return false;
			}
			if ( ! isset( $section['locator'] ) || $section['locator']['content_hash'] !== $source['content_hash'] || $section['locator']['start_utf16'] !== $section['start_utf16'] || $section['locator']['end_utf16'] !== $section['end_utf16'] ) {
				return false;
			}
			if ( ! $this->score_text_matches( $section['raw_score'], $section['display_score'] ) ) {
				return false;
			}
			if ( isset( $score_texts[ $section['display_score'] ] ) && $score_texts[ $section['display_score'] ] !== $section['level'] ) {
				return false;
			}
			$score_texts[ $section['display_score'] ] = $section['level'];
			$margins[]                                = (float) $section['raw_margin'];
			if ( null === $strongest || (float) $section['raw_score'] > (float) $strongest['raw_score'] ) {
				$strongest = $section;
			}
			$previous_end = $section['end_utf16'];
		}

		if ( ! $strongest || $ai['strongest_section_index'] !== $strongest['index'] || (float) $ai['raw_score'] !== (float) $strongest['raw_score'] || (float) $ai['raw_margin'] !== (float) $strongest['raw_margin'] || $ai['level'] !== $strongest['level'] || ! $this->score_text_matches( $ai['raw_score'], $ai['display_score'] ) ) {
			return false;
		}

		if ( isset( $score_texts[ $ai['display_score'] ] ) && $score_texts[ $ai['display_score'] ] !== $ai['level'] ) {
			return false;
		}

		rsort( $margins, SORT_NUMERIC );
		$primary_fired   = $margins[0] >= 3.570935;
		$secondary_fired = count( $margins ) > 1 && $margins[1] + 0.34 >= 3.570935;
		$expected_flag   = $primary_fired || $secondary_fired;
		$expected_reason = $primary_fired ? 'primary' : ( $secondary_fired ? 'secondary' : null );
		$expected_status = $expected_flag ? 'attention' : 'pass';
		if ( $expected_flag !== $ai['flagged'] || $expected_reason !== $ai['flag_reason'] || $expected_status !== $ai['method_status'] ) {
			return false;
		}

		return $this->share_matches( $payload['exports']['share'], $ai, $sections );
	}

	private function current_wordpress_model_route( array $route, array $ai, array $controls ) {
		$model = isset( $route['model'] ) && is_array( $route['model'] ) ? $route['model'] : array();
		$rule  = isset( $model['flag_rule'] ) && is_array( $model['flag_rule'] ) ? $model['flag_rule'] : array();
		if ( ! isset( $route['kind'], $route['content_transfer'], $route['consent'], $controls['channel_authentication'], $model['identity'], $model['precision'], $model['segmentation_contract'], $model['input_contract'], $model['features_contract'], $model['scoring_contract'], $rule['expression'], $rule['primary_margin'], $rule['secondary_gap'] ) ) {
			return false;
		}
		$identity_matches = 'tier3-cycle5-v1' === $model['identity']
			&& 'tier3-cycle5-v1' === $ai['source']
			&& 'segments-v3' === $model['segmentation_contract']
			&& 'raw-v1' === $model['input_contract']
			&& 'features-v1' === $model['features_contract']
			&& 'margin-v1' === $model['scoring_contract']
			&& 'max(m1, m2 + 0.34) >= 3.570935' === $rule['expression']
			&& 3.570935 === (float) $rule['primary_margin']
			&& 0.34 === (float) $rule['secondary_gap'];
		if ( ! $identity_matches || 'explicit' !== $route['consent'] ) {
			return false;
		}
		if ( 'eu_server' === $route['kind'] ) {
			return 'eu_server' === $route['content_transfer']
				&& 'wordpress_challenge_token' === $controls['channel_authentication']
				&& isset( $model['registry_identity'] ) && 'tier3-cycle5-full' === $model['registry_identity']
				&& 'fp32' === $model['precision'];
		}
		return 'browser_model' === $route['kind']
			&& 'none' === $route['content_transfer']
			&& 'not_applicable' === $controls['channel_authentication']
			&& array_key_exists( 'registry_identity', $model ) && null === $model['registry_identity']
			&& 'int8' === $model['precision'];
	}

	private function score_text_matches( $raw_score, $display_score ) {
		if ( ! is_string( $display_score ) || ! preg_match( '/^(?:0|1)\.([0-9]+)$/', $display_score, $match ) ) {
			return false;
		}
		$tolerance = 0.5 * pow( 10, -strlen( $match[1] ) );
		return abs( (float) $display_score - (float) $raw_score ) <= $tolerance + PHP_FLOAT_EPSILON;
	}

	private function share_matches( array $share, array $ai, array $sections ) {
		if ( false === $share['available'] ) {
			return null === $share['payload'];
		}
		$payload = $share['payload'];
		if ( ! is_array( $payload ) || $payload['display_score'] !== $ai['display_score'] || $payload['level'] !== $ai['level'] || count( $payload['sections'] ) !== count( $sections ) ) {
			return false;
		}
		foreach ( $sections as $index => $section ) {
			$shared = $payload['sections'][ $index ];
			if ( $shared['index'] !== $section['index'] || (float) $shared['raw_score'] !== (float) $section['raw_score'] || $shared['display_score'] !== $section['display_score'] || $shared['level'] !== $section['level'] ) {
				return false;
			}
		}
		return true;
	}

	private function invalid() {
		return new WP_Error(
			'invalid_server_response',
			__( 'The server returned a result this plugin cannot safely display.', 'opace-ai-content-checker-detector' ),
			array( 'status' => 502 )
		);
	}
}
