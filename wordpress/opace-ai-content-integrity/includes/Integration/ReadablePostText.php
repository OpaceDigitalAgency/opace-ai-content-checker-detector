<?php
/**
 * Turns stored post content into the prose a person actually wrote.
 *
 * The checker reads writing, not markup. A post saved by the block editor is
 * stored with block delimiters and HTML around every paragraph, and loading
 * that raw string into the draft box put `<!-- wp:paragraph --><p>…` in front of
 * the writer and fed the analyser markup it should never score. This class
 * produces the readable text instead: block delimiters removed, tags stripped,
 * paragraph breaks kept as blank lines.
 *
 * @package Opace\ContentIntegrity
 */

namespace Opace\ContentIntegrity\Integration;

defined( 'ABSPATH' ) || exit;

/**
 * Converts stored post content into plain, readable text.
 */
final class ReadablePostText {

	/**
	 * Titles WordPress uses when there is no real one. None of these belong at
	 * the top of a draft.
	 *
	 * @var string[]
	 */
	private const PLACEHOLDER_TITLES = array( 'auto draft', 'untitled', '(no title)', 'no title' );

	/**
	 * Block-level tags whose close ends a paragraph, so the reader sees the same
	 * shape on the page as in the editor.
	 *
	 * @var string
	 */
	private const BLOCK_TAGS = 'address|article|aside|blockquote|div|dd|dl|dt|figcaption|figure|footer|h1|h2|h3|h4|h5|h6|header|hr|li|main|nav|ol|p|pre|section|table|td|th|tr|ul';

	/**
	 * The readable text of a post, with the title as a first line when the title
	 * reads like a sentence a person wrote.
	 *
	 * @param string $title       The post title.
	 * @param string $raw_content The stored post content.
	 * @return string Readable text. Never HTML, never block delimiters.
	 */
	public static function from_post( $title, $raw_content ) {
		$body = self::from_content( $raw_content );
		$line = self::title_line( $title, $body );
		if ( '' === $line ) {
			return $body;
		}
		return '' === $body ? $line : $line . "\n\n" . $body;
	}

	/**
	 * The readable text of stored post content, without the title.
	 *
	 * @param string $raw_content The stored post content.
	 * @return string Readable text.
	 */
	public static function from_content( $raw_content ) {
		$text = (string) $raw_content;
		if ( '' === trim( $text ) ) {
			return '';
		}

		// Block delimiters are HTML comments. Removing every comment takes the
		// delimiters with it and keeps the inner HTML of every block, including
		// the blocks excerpt_remove_blocks() would throw away whole.
		$text = self::replace( '/<!--.*?-->/s', '', $text );

		// A shortcode is an instruction to the theme, not prose.
		if ( function_exists( 'strip_shortcodes' ) ) {
			$text = strip_shortcodes( $text );
		}

		// Script and style bodies are code. wp_strip_all_tags() drops them too,
		// but only when it recognises the pair, so do it explicitly first.
		$text = self::replace( '#<(script|style)\b[^>]*>.*?</\1\s*>#is', '', $text );

		// Keep the shape: a line break is a line break, the end of a block is a
		// blank line. Both markers go in before the tags are stripped.
		$text = self::replace( '#<br\s*/?>#i', "\n", $text );
		$text = self::replace( '#</(?:' . self::BLOCK_TAGS . ')\s*>#i', "\n\n", $text );
		$text = self::replace( '#<(?:hr|img)\b[^>]*>#i', "\n\n", $text );

		$text = wp_strip_all_tags( $text );
		$text = html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );

		// A non-breaking space in stored content is an editor artefact, and the
		// invisible-character check would otherwise report the editor rather
		// than the writing.
		$text = str_replace( "\xc2\xa0", ' ', $text );

		$text = str_replace( array( "\r\n", "\r" ), "\n", $text );
		// Trim the whitespace the markup left at the edges of a line, but leave the
		// spacing inside a sentence exactly as it was written.
		$text = self::replace( '/[ \t]*\n[ \t]*/', "\n", $text );
		$text = self::replace( '/\n{3,}/', "\n\n", $text );

		return trim( $text );
	}

	/**
	 * The title, when it belongs at the top of the draft.
	 *
	 * A title is kept when it is real writing: not one of WordPress's
	 * placeholders, not a bare number or slug, short enough to be a title, and
	 * not already the first line of the body.
	 *
	 * @param string $title The post title.
	 * @param string $body  The readable body, used to avoid repeating a heading.
	 * @return string The title line, or an empty string.
	 */
	private static function title_line( $title, $body ) {
		$title = trim( html_entity_decode( (string) $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
		$title = str_replace( "\xc2\xa0", ' ', $title );
		$title = trim( self::replace( '/\s+/u', ' ', $title ) );
		if ( '' === $title || mb_strlen( $title ) > 200 ) {
			return '';
		}
		if ( in_array( mb_strtolower( $title ), self::PLACEHOLDER_TITLES, true ) ) {
			return '';
		}
		// A title with no letter in it (an id, a date, a filename) is a label,
		// not a sentence.
		if ( ! preg_match( '/\p{L}/u', $title ) ) {
			return '';
		}
		$lines = explode( "\n", $body );
		$first = trim( $lines[0] );
		if ( '' !== $first && 0 === strcasecmp( $first, $title ) ) {
			return '';
		}
		return $title;
	}

	/**
	 * Replaces by pattern without ever turning a post into null.
	 *
	 * A backtrack limit on a very large post makes preg_replace() return null.
	 * Keeping the input in that case leaves some markup in the draft, which is
	 * far better than emptying it.
	 *
	 * @param string $pattern     The pattern.
	 * @param string $replacement The replacement.
	 * @param string $subject     The subject.
	 * @return string The replaced subject, or the subject unchanged.
	 */
	private static function replace( $pattern, $replacement, $subject ) {
		$result = preg_replace( $pattern, $replacement, $subject );
		return null === $result ? $subject : $result;
	}
}
