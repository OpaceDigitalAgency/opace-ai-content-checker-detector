<?php

namespace Opace\ContentIntegrity\Analysis;

defined( 'ABSPATH' ) || exit;

final class PatternAnalyser {
	const VERSION = 'en-gb:2026.08.1';

	public function inspect( $text ) {
		$phrases  = array( "in today's rapidly evolving landscape", 'game-changer', 'in conclusion', 'it is important to note', 'delve into' );
		$lower    = mb_strtolower( $text, 'UTF-8' );
		$findings = array();
		foreach ( $phrases as $phrase ) {
			$byte = strpos( $lower, $phrase );
			if ( false === $byte ) {
				continue;
			}
			$matched = substr( $text, $byte, strlen( $phrase ) );
			$count   = substr_count( $lower, $phrase );
			$this->add_finding(
				$findings,
				$text,
				$byte,
				$matched,
				'style.overused_phrase',
				$count > 1 ? 'medium' : 'low',
				'A stock phrase may make the passage feel generic.',
				'Review whether a more specific statement would be clearer.',
				array(
					'matched'   => $matched,
					'count'     => $count,
					'threshold' => 1,
				)
			);
		}

		$openings  = array();
		$sentences = preg_split( '/(?<=[.!?])\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_OFFSET_CAPTURE );
		foreach ( $sentences as $sentence ) {
			$words   = preg_split( '/\s+/u', trim( $sentence[0] ), -1, PREG_SPLIT_NO_EMPTY );
			$opening = mb_strtolower( implode( ' ', array_slice( $words, 0, 3 ) ), 'UTF-8' );
			if ( count( $words ) >= 2 ) {
				$openings[ $opening ][] = $sentence[1];
			}
		}
		foreach ( $openings as $opening => $starts ) {
			if ( count( $starts ) < 3 ) {
				continue;
			}
			$matched = substr( $text, $starts[0], strlen( $opening ) );
			$this->add_finding(
				$findings,
				$text,
				$starts[0],
				$matched,
				'style.repeated_opening',
				'medium',
				'Several sentences begin the same way.',
				'Vary only the openings that genuinely benefit from it.',
				array(
					'matched'   => $matched,
					'count'     => count( $starts ),
					'threshold' => 3,
				)
			);
		}

		preg_match_all( '/\b(?:moreover|furthermore|additionally|consequently|therefore|however)\b/iu', $text, $transitions, PREG_OFFSET_CAPTURE );
		preg_match_all( '/\S+/u', trim( $text ), $words );
		$transition_count = count( $transitions[0] );
		$word_count       = count( $words[0] );
		if ( $word_count >= 40 && $transition_count / $word_count > 0.04 ) {
			$matched = $transitions[0][0][0];
			$this->add_finding(
				$findings,
				$text,
				$transitions[0][0][1],
				$matched,
				'style.transition_density',
				'low',
				'Transition words are unusually dense.',
				'Remove transitions that do not clarify the relationship between sentences.',
				array(
					'matched'         => $matched,
					'count'           => $transition_count,
					'word_count'      => $word_count,
					'threshold_ratio' => 0.04,
				)
			);
		}

		usort(
			$findings,
			static function ( $a, $b ) {
				return $a['span']['start_utf16'] === $b['span']['start_utf16'] ? strcmp( $a['rule_id'], $b['rule_id'] ) : $a['span']['start_utf16'] - $b['span']['start_utf16'];
			}
		);
		return $findings;
	}

	private function add_finding( array &$findings, $text, $byte, $matched, $rule, $severity, $message, $suggestion, array $evidence ) {
		$findings[] = array(
			'rule_id'           => $rule,
			'rule_version'      => self::VERSION,
			'severity'          => $severity,
			'message'           => $message,
			'suggestion'        => $suggestion,
			'span'              => TextOffsets::range_from_bytes( $text, $byte, strlen( $matched ) ),
			'matched_text_hash' => 'sha256:' . hash( 'sha256', $matched ),
			'evidence'          => $evidence,
		);
	}
}
