<?php

namespace Opace\ContentIntegrity\Contracts;

use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * Validates the bounded Cycle-5 service response before it reaches the browser.
 *
 * The browser composes the canonical checker-result object from this primitive,
 * the already-completed deterministic result and its local working copy.
 */
final class WordPressServerScoreValidator {
	const MODEL_BUILD = '45e00978b10d1df6';

	public function validate( $payload, $text ) {
		if ( ! is_array( $payload ) || 'tier3-cycle5-full' !== ( isset( $payload['model'] ) ? $payload['model'] : '' )
			|| self::MODEL_BUILD !== ( isset( $payload['model_build'] ) ? $payload['model_build'] : '' )
			|| 'fp32' !== ( isset( $payload['precision'] ) ? $payload['precision'] : '' )
			|| 'segments-v3' !== ( isset( $payload['segmentation_contract'] ) ? $payload['segmentation_contract'] : '' )
			|| 'raw-v1' !== ( isset( $payload['input_normalisation'] ) ? $payload['input_normalisation'] : '' )
			|| 'features-v1' !== ( isset( $payload['features_contract'] ) ? $payload['features_contract'] : '' )
			|| 'margin-v1' !== ( isset( $payload['scoring'] ) ? $payload['scoring'] : '' )
			|| 'max' !== ( isset( $payload['aggregation'] ) ? $payload['aggregation'] : '' )
			|| 'wordpress-v1' !== ( isset( $payload['channel'] ) ? $payload['channel'] : '' )
			|| 'server' !== ( isset( $payload['processed'] ) ? $payload['processed'] : '' )
			|| 'nothing' !== ( isset( $payload['retained'] ) ? $payload['retained'] : '' )
			|| false !== ( isset( $payload['truncated'] ) ? $payload['truncated'] : null )
			|| ! isset( $payload['segments'] ) || ! is_array( $payload['segments'] )
			|| count( $payload['segments'] ) < 1 || count( $payload['segments'] ) > 256 ) {
			return $this->invalid();
		}

		$word_count  = count( preg_split( '/\s+/u', trim( $text ), -1, PREG_SPLIT_NO_EMPTY ) );
		$point_count = function_exists( 'mb_strlen' ) ? mb_strlen( $text, 'UTF-8' ) : strlen( $text );
		if ( ! $this->same_integer( $payload, 'word_count', $word_count )
			|| ! $this->same_integer( $payload, 'words_sent', $word_count )
			|| ! $this->same_integer( $payload, 'segment_count', count( $payload['segments'] ) )
			|| ! $this->same_number( $payload, 'threshold_margin', 3.570935 )
			|| ! $this->same_number( $payload, 'secondary_gap', 0.34 ) ) {
			return $this->invalid();
		}

		$previous_end = 0;
		foreach ( $payload['segments'] as $index => $segment ) {
			if ( ! is_array( $segment ) || ! $this->same_integer( $segment, 'index', $index )
				|| ! $this->bounded_integer( $segment, 'char_start', $previous_end, $point_count - 1 )
				|| ! $this->bounded_integer( $segment, 'char_end', $segment['char_start'] + 1, $point_count )
				|| ! $this->bounded_integer( $segment, 'words', 1, $word_count )
				|| ! $this->bounded_integer( $segment, 'tokens_scored', 1, 512 )
				|| ! $this->bounded_number( $segment, 'probability_ai', 0, 1 )
				|| ! $this->bounded_number( $segment, 'margin', -100, 100 )
				|| false !== ( isset( $segment['truncated'] ) ? $segment['truncated'] : null ) ) {
				return $this->invalid();
			}
			$previous_end = $segment['char_end'];
		}

		if ( ! $this->bounded_integer( $payload, 'strongest_segment', 0, count( $payload['segments'] ) - 1 )
			|| ! is_bool( isset( $payload['flagged'] ) ? $payload['flagged'] : null )
			|| ! in_array( isset( $payload['flag_reason'] ) ? $payload['flag_reason'] : null, array( null, 'primary', 'secondary' ), true ) ) {
			return $this->invalid();
		}

		$strongest = $payload['segments'][ $payload['strongest_segment'] ];
		if ( ! $this->same_number( $payload, 'margin', $strongest['margin'] )
			|| ! $this->same_number( $payload, 'probability_ai', $strongest['probability_ai'] ) ) {
			return $this->invalid();
		}
		return true;
	}

	private function same_integer( array $value, $key, $expected ) {
		return isset( $value[ $key ] ) && is_int( $value[ $key ] ) && $expected === $value[ $key ];
	}

	private function same_number( array $value, $key, $expected ) {
		return isset( $value[ $key ] ) && is_numeric( $value[ $key ] ) && (float) $expected === (float) $value[ $key ];
	}

	private function bounded_integer( array $value, $key, $minimum, $maximum ) {
		return isset( $value[ $key ] ) && is_int( $value[ $key ] ) && $value[ $key ] >= $minimum && $value[ $key ] <= $maximum;
	}

	private function bounded_number( array $value, $key, $minimum, $maximum ) {
		return isset( $value[ $key ] ) && is_numeric( $value[ $key ] ) && $value[ $key ] >= $minimum && $value[ $key ] <= $maximum;
	}

	private function invalid() {
		return new WP_Error(
			'invalid_server_response',
			__( 'The server returned a result this plugin cannot safely display.', 'opace-ai-content-checker-detector' ),
			array( 'status' => 502 )
		);
	}
}
