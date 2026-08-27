<?php

namespace Opace\ContentIntegrity\Analysis;

defined( 'ABSPATH' ) || exit;

final class TextOffsets {
	public static function range_from_bytes( $text, $byte_start, $byte_length ) {
		$prefix = substr( $text, 0, $byte_start );
		$match  = substr( $text, $byte_start, $byte_length );
		return array(
			'start_utf16'     => self::utf16_length( $prefix ),
			'end_utf16'       => self::utf16_length( $prefix . $match ),
			'start_codepoint' => mb_strlen( $prefix, 'UTF-8' ),
			'end_codepoint'   => mb_strlen( $prefix . $match, 'UTF-8' ),
		);
	}

	public static function utf16_length( $text ) {
		return (int) ( strlen( mb_convert_encoding( $text, 'UTF-16BE', 'UTF-8' ) ) / 2 );
	}
}
