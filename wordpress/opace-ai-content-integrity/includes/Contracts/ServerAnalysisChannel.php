<?php

namespace Opace\ContentIntegrity\Contracts;

defined( 'ABSPATH' ) || exit;

interface ServerAnalysisChannel {
	public function available();

	public function authorise( array $request_args );

	/**
	 * The allowance figures the service published about itself, each null when
	 * it published none. Screens use these to print the current numbers instead
	 * of a guess.
	 *
	 * @return array<string,int|null>
	 */
	public function limits();
}
