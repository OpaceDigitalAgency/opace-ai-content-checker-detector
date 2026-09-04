<?php

namespace Opace\ContentIntegrity\Contracts;

defined( 'ABSPATH' ) || exit;

interface ServerAnalysisChannel {
	/**
	 * Whether the channel is open, according to the answer already held. This
	 * must never ask the service: screens call it while they are being drawn.
	 *
	 * @return bool
	 */
	public function available();

	/**
	 * Whether any answer is held at all. False means nothing has asked the
	 * service yet, so available() reads as "not known" rather than "no", and a
	 * screen can say it is still checking instead of claiming the route is off.
	 *
	 * @return bool
	 */
	public function status_known();

	/**
	 * Asks the service and remembers the answer, reusing one already held.
	 * This is the only method that may block on the network.
	 *
	 * @return bool Whether the channel is open.
	 */
	public function probe();

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
