<?php

namespace Opace\ContentIntegrity\Analysis;

defined( 'ABSPATH' ) || exit;

final class ProtectedSpanExtractor {
	public function extract( $text, $content_hash ) {
		$rules = array(
			'code'     => '/```[\s\S]*?```|`[^`\n]+`/u',
			'url'      => '/https?:\/\/[^\s<>)\]]+/u',
			'email'    => '/\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/iu',
			'citation' => '/\[[0-9]+\]|\([A-Z][A-Za-z\-]+,?\s+\d{4}[a-z]?\)/u',
			'quote'    => '/[“"][^”"\n]+[”"]/u',
			'currency' => '/(?:£|\$|€)\s?\d[\d,]*(?:\.\d+)?/u',
			'date'     => '/\b(?:\d{1,2}\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})\b/u',
			'time'     => '/\b\d{1,2}:\d{2}(?:\s?[ap]m)?\b/iu',
			'unit'     => '/\b\d+(?:\.\d+)?\s?(?:kg|g|km|m|cm|mm|GB|MB|%|°C)\b/u',
			'number'   => '/\b\d[\d,]*(?:\.\d+)?%?\b/u',
		);
		$spans = array();
		foreach ( $rules as $kind => $regex ) {
			if ( ! preg_match_all( $regex, $text, $matches, PREG_OFFSET_CAPTURE ) ) {
				continue;
			}
			foreach ( $matches[0] as $match ) {
				$range   = TextOffsets::range_from_bytes( $text, $match[1], strlen( $match[0] ) );
				$spans[] = array_merge(
					array(
						'id'               => 'ps_' . $kind . '_' . $range['start_utf16'] . '_' . substr( hash( 'sha256', $match[0] ), 0, 8 ),
						'kind'             => $kind,
						'text'             => $match[0],
						'normalised_value' => $match[0],
						'policy'           => in_array( $kind, array( 'date', 'number' ), true ) ? 'equivalent_format' : 'exact',
						'source'           => 'deterministic',
						'confidence'       => null,
						'content_hash'     => $content_hash,
					),
					$range
				);
			}
		}
		$unique = array();
		foreach ( $spans as $span ) {
			$unique[ $span['start_utf16'] . ':' . $span['end_utf16'] . ':' . $span['kind'] ] = $span;
		}
		$spans = array_values( $unique );
		usort(
			$spans,
			static function ( $a, $b ) {
				return $a['start_utf16'] - $b['start_utf16'];
			}
		);
		return $spans;
	}
}
