<?php

namespace Opace\ContentIntegrity\Analysis;

defined( 'ABSPATH' ) || exit;

final class HomoglyphAnalyser {
	public function inspect( $text ) {
		$findings   = array();
		$confusable = array(
			'а' => array( '0430', 'CYRILLIC SMALL LETTER A' ),
			'е' => array( '0435', 'CYRILLIC SMALL LETTER IE' ),
			'о' => array( '043E', 'CYRILLIC SMALL LETTER O' ),
			'р' => array( '0440', 'CYRILLIC SMALL LETTER ER' ),
			'с' => array( '0441', 'CYRILLIC SMALL LETTER ES' ),
			'х' => array( '0445', 'CYRILLIC SMALL LETTER HA' ),
			'у' => array( '0443', 'CYRILLIC SMALL LETTER U' ),
		);
		if ( ! preg_match_all( '/[\p{Latin}\p{Cyrillic}\p{Greek}\p{N}_-]+/u', $text, $tokens, PREG_OFFSET_CAPTURE ) ) {
			return $findings;
		}
		foreach ( $tokens[0] as $token ) {
			if ( ! preg_match( '/\p{Latin}/u', $token[0] ) || ! preg_match( '/[\p{Cyrillic}\p{Greek}]/u', $token[0] ) ) {
				continue;
			}
			$characters = preg_split( '//u', $token[0], -1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_OFFSET_CAPTURE );
			foreach ( $characters as $character ) {
				if ( ! isset( $confusable[ $character[0] ] ) ) {
					continue;
				}
				$rule       = $confusable[ $character[0] ];
				$byte_start = $token[1] + $character[1];
				$range      = TextOffsets::range_from_bytes( $text, $byte_start, strlen( $character[0] ) );
				$findings[] = array(
					'id'                => 'unicode_' . $range['start_utf16'] . '_homoglyph_' . strtolower( ltrim( $rule[0], '0' ) ),
					'code_point'        => 'U+' . $rule[0],
					'name'              => $rule[1],
					'severity'          => 'medium',
					'message'           => 'A mixed-script token contains a character visually confusable with Latin text.',
					'suggestion'        => 'Verify the intended spelling; homoglyphs are never replaced automatically.',
					'span'              => $range,
					'matched_text_hash' => 'sha256:' . hash( 'sha256', $character[0] ),
					'fix'               => 'review',
					'limitations'       => array( 'Mixed scripts can be legitimate in names and multilingual text; this is contextual evidence only.' ),
				);
			}
		}
		return $findings;
	}
}
