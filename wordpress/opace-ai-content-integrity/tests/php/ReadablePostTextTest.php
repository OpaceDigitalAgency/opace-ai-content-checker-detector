<?php

use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use Opace\ContentIntegrity\Contracts\ServerAnalysisAdapter;
use Opace\ContentIntegrity\Integration\ReadablePostText;
use Opace\ContentIntegrity\Integration\WordPressPostSource;
use Opace\ContentIntegrity\Receipts\ReceiptService;
use Opace\ContentIntegrity\Rest\RestController;
use Opace\ContentIntegrity\Rest\ServerRateLimiter;
use Opace\ContentIntegrity\Rewrite\SessionService;
use Opace\ContentIntegrity\Storage\JobRepository;
use Opace\ContentIntegrity\Storage\ReceiptRepository;
use PHPUnit\Framework\TestCase;

/**
 * The row action loads a post into the checker. What arrives has to be the
 * writing, not the block delimiters and HTML the editor stores around it.
 */
final class ReadablePostTextTest extends TestCase {

	/** The default "Hello world!" post, exactly as the block editor stores it. */
	private const BLOCK_FIXTURE = "<!-- wp:paragraph -->\n<p>Welcome to WordPress. This is your first post. Edit or delete it, then start writing!</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">What happens next</h2>\n<!-- /wp:heading -->\n\n<!-- wp:list -->\n<ul class=\"wp-block-list\"><!-- wp:list-item -->\n<li>Write a draft.</li>\n<!-- /wp:list-item -->\n\n<!-- wp:list-item -->\n<li>Check it before you publish.</li>\n<!-- /wp:list-item --></ul>\n<!-- /wp:list -->";

	protected function setUp(): void {
		$GLOBALS['oaci_test_options']      = array();
		$GLOBALS['oaci_test_transients']   = array();
		$GLOBALS['oaci_test_logged_in']    = false;
		$GLOBALS['oaci_test_capabilities'] = array();
		$GLOBALS['oaci_test_posts']        = array();
	}

	public function test_block_editor_content_becomes_readable_text() {
		$text = ReadablePostText::from_content( self::BLOCK_FIXTURE );

		$this->assertStringNotContainsString( '<!--', $text );
		$this->assertStringNotContainsString( 'wp:paragraph', $text );
		$this->assertStringNotContainsString( '<p>', $text );
		$this->assertStringNotContainsString( '<li>', $text );
		$this->assertStringNotContainsString( 'wp-block', $text );
		$this->assertSame(
			"Welcome to WordPress. This is your first post. Edit or delete it, then start writing!\n\nWhat happens next\n\nWrite a draft.\n\nCheck it before you publish.",
			$text
		);
	}

	public function test_paragraphs_stay_apart_and_line_breaks_survive() {
		$text = ReadablePostText::from_content( "<!-- wp:paragraph -->\n<p>One.<br>Still one.</p>\n<!-- /wp:paragraph -->\n<!-- wp:paragraph -->\n<p>Two.</p>\n<!-- /wp:paragraph -->" );

		$this->assertSame( "One.\nStill one.\n\nTwo.", $text );
		$this->assertSame( 2, substr_count( $text, "\n\n" ) + 1 );
	}

	public function test_entities_shortcodes_and_editor_spaces_are_resolved() {
		$text = ReadablePostText::from_content( '<p>Ben &amp; Jerry&#8217;s &lt;draft&gt;&nbsp;copy [gallery ids="1,2"] ends here.</p>' );

		$this->assertSame( 'Ben & Jerry’s <draft> copy  ends here.', $text );
		$this->assertStringNotContainsString( 'gallery', $text );
		$this->assertStringNotContainsString( "\xc2\xa0", $text );
	}

	public function test_script_and_style_bodies_never_reach_the_draft() {
		$text = ReadablePostText::from_content( '<p>Real writing.</p><script>window.x = 1;</script><style>.a{color:red}</style><p>More writing.</p>' );

		$this->assertSame( "Real writing.\n\nMore writing.", $text );
	}

	public function test_a_real_title_leads_the_draft_and_a_placeholder_does_not() {
		$this->assertSame(
			"Hello world!\n\nWelcome to WordPress.",
			ReadablePostText::from_post( 'Hello world!', '<!-- wp:paragraph --><p>Welcome to WordPress.</p><!-- /wp:paragraph -->' )
		);
		$this->assertSame( 'Welcome to WordPress.', ReadablePostText::from_post( 'Auto Draft', '<p>Welcome to WordPress.</p>' ) );
		$this->assertSame( 'Welcome to WordPress.', ReadablePostText::from_post( '2026-09-02', '<p>Welcome to WordPress.</p>' ) );
		$this->assertSame( 'Welcome to WordPress.', ReadablePostText::from_post( '   ', '<p>Welcome to WordPress.</p>' ) );
	}

	public function test_a_title_already_written_as_the_first_heading_is_not_repeated() {
		$text = ReadablePostText::from_post( 'What happens next', "<!-- wp:heading -->\n<h2>What happens next</h2>\n<!-- /wp:heading -->\n<p>Then this.</p>" );

		$this->assertSame( "What happens next\n\nThen this.", $text );
	}

	public function test_empty_and_media_only_posts_produce_nothing_rather_than_markup() {
		$this->assertSame( '', ReadablePostText::from_content( '' ) );
		$this->assertSame( '', ReadablePostText::from_content( "<!-- wp:image {\"id\":9} -->\n<figure class=\"wp-block-image\"><img src=\"http://x.test/a.png\" alt=\"\"/></figure>\n<!-- /wp:image -->" ) );
	}

	public function test_the_rest_route_returns_the_readable_text_and_says_it_is_plain_text() {
		$GLOBALS['oaci_test_posts'][12] = new WP_Post(
			array(
				'ID'           => 12,
				'post_title'   => 'Hello world!',
				'post_content' => self::BLOCK_FIXTURE,
				'post_type'    => 'post',
				'post_status'  => 'publish',
			)
		);

		$response = $this->controller()->post_content( new WP_REST_Request( array( 'id' => 12 ) ) );

		$this->assertIsArray( $response );
		$this->assertSame( 'plain_text', $response['content_type'] );
		$this->assertSame( 'Hello world!', $response['title'] );
		$this->assertStringStartsWith( "Hello world!\n\nWelcome to WordPress.", $response['content'] );
		$this->assertStringNotContainsString( '<!-- wp:', $response['content'] );
		$this->assertStringNotContainsString( '<p>', $response['content'] );
	}

	public function test_a_trashed_or_missing_post_is_still_refused() {
		$controller = $this->controller();
		$this->assertSame( 'object_not_found', $controller->post_content( new WP_REST_Request( array( 'id' => 99 ) ) )->get_error_code() );

		$GLOBALS['oaci_test_posts'][13] = new WP_Post( array( 'ID' => 13, 'post_content' => '<p>Gone.</p>', 'post_status' => 'trash' ) );
		$this->assertSame( 'object_not_found', $controller->post_content( new WP_REST_Request( array( 'id' => 13 ) ) )->get_error_code() );
	}

	public function test_a_post_over_the_site_limit_is_refused_rather_than_shortened() {
		$GLOBALS['oaci_test_options']['oaci_settings'] = array( 'max_chars' => 10000 );
		$GLOBALS['oaci_test_posts'][14]                = new WP_Post(
			array(
				'ID'           => 14,
				'post_title'   => 'Long one',
				'post_content' => '<p>' . str_repeat( 'word ', 3000 ) . '</p>',
			)
		);

		$error = $this->controller()->post_content( new WP_REST_Request( array( 'id' => 14 ) ) );

		$this->assertSame( 'post_too_long', $error->get_error_code() );
	}

	public function test_reading_a_post_still_needs_the_rest_nonce_and_edit_post() {
		$controller = $this->controller();
		$request    = new WP_REST_Request( array( 'id' => 12 ), array( 'X-WP-Nonce' => 'valid-rest-nonce' ) );
		$this->assertSame( 'permission_denied', $controller->can_read_post( $request )->get_error_code() );

		$GLOBALS['oaci_test_logged_in'] = true;
		$this->assertSame( 'permission_denied', $controller->can_read_post( new WP_REST_Request( array( 'id' => 12 ), array( 'X-WP-Nonce' => 'wrong' ) ) )->get_error_code() );

		$this->assertFalse( $controller->can_read_post( $request ) );
		$GLOBALS['oaci_test_capabilities']['edit_post'] = true;
		$this->assertTrue( $controller->can_read_post( $request ) );
	}

	private function controller() {
		$analyser = new DeterministicAnalyser();
		$source   = new WordPressPostSource();
		$sessions = new SessionService( new JobRepository(), $analyser, $source );
		$receipts = new ReceiptService( new ReceiptRepository() );
		return new RestController( $analyser, $sessions, $receipts, $source, $this->adapter(), new ServerRateLimiter() );
	}

	private function adapter() {
		return new class() implements ServerAnalysisAdapter {
			public function status() {
				return array( 'available' => false, 'checking' => false, 'recommended' => 'on_device', 'state' => 'channel_unavailable', 'limits' => array() );
			}

			public function probed_status() {
				return $this->status();
			}

			public function analyse( $text, $request_id ) {
				return array( 'accepted' => true );
			}
		};
	}
}
