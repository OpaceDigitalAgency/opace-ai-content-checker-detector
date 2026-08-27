<?php

namespace Opace\ContentIntegrity\Analysis;

defined( 'ABSPATH' ) || exit;

final class UnicodeAnalyser {
	private $rules = array(
		'EFBBBF' => array( 'BYTE ORDER MARK', 'low', 'remove', 'feff', 'A byte-order mark is present.' ),
		'E2808B' => array( 'ZERO WIDTH SPACE', 'medium', 'remove', '200b', 'An invisible zero-width space is present.' ),
		'E281A0' => array( 'WORD JOINER', 'medium', 'remove', '2060', 'An invisible word joiner is present.' ),
		'C2AD'   => array( 'SOFT HYPHEN', 'low', 'remove', 'ad', 'A discretionary soft hyphen is present.' ),
		'C2A0'   => array( 'NO-BREAK SPACE', 'note', 'space', 'a0', 'A non-breaking space is present.' ),
		'E28089' => array( 'THIN SPACE', 'note', 'space', '2009', 'A thin space is present.' ),
		'EFBFBD' => array( 'REPLACEMENT CHARACTER', 'high', 'review', 'fffd', 'A replacement character may indicate damaged text.' ),
		'E280AA' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '202a', 'A bidirectional formatting control is present.' ),
		'E280AB' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '202b', 'A bidirectional formatting control is present.' ),
		'E280AC' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '202c', 'A bidirectional formatting control is present.' ),
		'E280AD' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '202d', 'A bidirectional formatting control is present.' ),
		'E280AE' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '202e', 'A bidirectional formatting control is present.' ),
		'E281A6' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '2066', 'A bidirectional formatting control is present.' ),
		'E281A7' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '2067', 'A bidirectional formatting control is present.' ),
		'E281A8' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '2068', 'A bidirectional formatting control is present.' ),
		'E281A9' => array( 'BIDIRECTIONAL CONTROL', 'medium', 'review', '2069', 'A bidirectional formatting control is present.' ),
	);

	public function inspect( $text ) {
		$findings = array();
		foreach ( $this->rules as $hex => $rule ) {
			$character = hex2bin( $hex );
			$offset    = 0;
			$found     = strpos( $text, $character, $offset );
			while ( false !== $found ) {
				$range      = TextOffsets::range_from_bytes( $text, $found, strlen( $character ) );
				$findings[] = array(
					'id'                => 'unicode_' . $range['start_utf16'] . '_' . $rule[3],
					'code_point'        => $this->code_point_label( $character ),
					'name'              => $rule[0],
					'severity'          => $rule[1],
					'message'           => $rule[4],
					'suggestion'        => 'review' === $rule[2] ? 'Review the surrounding script and direction before editing.' : 'Preview the deterministic change before approval.',
					'span'              => $range,
					'matched_text_hash' => 'sha256:' . hash( 'sha256', $character ),
					'fix'               => $rule[2],
					'limitations'       => array( 'Unicode controls can be legitimate in multilingual text; this finding is not evidence of authorship.' ),
				);
				$offset     = $found + strlen( $character );
				$found      = strpos( $text, $character, $offset );
			}
		}

		usort(
			$findings,
			static function ( $a, $b ) {
				return $a['span']['start_utf16'] - $b['span']['start_utf16'];
			}
		);
		return $findings;
	}

	private function code_point_label( $character ) {
		$ucs4 = unpack( 'N', mb_convert_encoding( $character, 'UCS-4BE', 'UTF-8' ) );
		return sprintf( 'U+%04X', $ucs4[1] );
	}
}
