<?php

namespace Opace\ContentIntegrity\Core;

use Opace\ContentIntegrity\Admin\Admin;
use Opace\ContentIntegrity\Adapters\OpaceEuServerAdapter;
use Opace\ContentIntegrity\Adapters\WordPressServerAnalysisChannel;
use Opace\ContentIntegrity\Analysis\DeterministicAnalyser;
use Opace\ContentIntegrity\Editor\BlockEditor;
use Opace\ContentIntegrity\Editor\ClassicEditor;
use Opace\ContentIntegrity\Integration\PublicApi;
use Opace\ContentIntegrity\Integration\WordPressPostSource;
use Opace\ContentIntegrity\Receipts\ReceiptService;
use Opace\ContentIntegrity\Rest\RestController;
use Opace\ContentIntegrity\Rest\ServerRateLimiter;
use Opace\ContentIntegrity\Rewrite\SessionService;
use Opace\ContentIntegrity\Storage\JobRepository;
use Opace\ContentIntegrity\Storage\ReceiptRepository;

defined( 'ABSPATH' ) || exit;

final class Plugin {
	private static $instance;
	private $booted = false;

	public static function instance() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function boot() {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		$migrator = new Migrator();
		$migrator->maybe_migrate();

		$analyser = new DeterministicAnalyser();
		$source   = new WordPressPostSource();
		$sessions = new SessionService( new JobRepository(), $analyser, $source );
		$receipts = new ReceiptService( new ReceiptRepository() );
		$server   = new OpaceEuServerAdapter( new WordPressServerAnalysisChannel() );
		$sessions->set_receipt_service( $receipts );

		( new Admin( $server ) )->register();
		( new BlockEditor( $server ) )->register();
		( new ClassicEditor( $server ) )->register();
		( new RestController( $analyser, $sessions, $receipts, $source, $server, new ServerRateLimiter() ) )->register();

		$api = PublicApi::instance();
		$api->configure( $sessions, $receipts, $source );
		do_action( 'oaci_ready', $api );

		add_action( 'oaci_retention', array( 'Opace\\ContentIntegrity\\Storage\\RetentionService', 'run' ) );
	}
}
