<?php

namespace Opace\ContentIntegrity\Contracts;

defined( 'ABSPATH' ) || exit;

interface ServerAnalysisAdapter {
	/**
	 * What the site already knows about the route. Never asks the service, so a
	 * screen can be drawn immediately.
	 *
	 * @return array
	 */
	public function status();

	/**
	 * The same, having asked the service when nothing was known. Called from
	 * the browser after the screen is on, never while one is being drawn.
	 *
	 * @return array
	 */
	public function probed_status();

	public function analyse( $text, $request_id );
}
