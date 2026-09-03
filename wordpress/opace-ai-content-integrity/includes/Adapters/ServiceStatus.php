<?php

namespace Opace\ContentIntegrity\Adapters;

defined( 'ABSPATH' ) || exit;

/**
 * What the EU service says about itself, read from GET /v1/status.
 *
 * The plugin asks two separate questions of that response and this class keeps
 * them apart. The first is whether the WordPress channel may be used at all,
 * which is a strict identity check: every contract the plugin was built against
 * has to match, or the route stays closed. The second is how much allowance is
 * left, which is decoration. A number the service has not published yet must
 * come back as null so the screens can stay quiet rather than print a guess.
 *
 * The service grew per-channel floors, a shared pool and a per-site limit after
 * this client was written, so each figure is looked for under more than one
 * name. An unknown shape is not an error: it means no number is shown.
 */
final class ServiceStatus {
	/**
	 * Whether the WordPress channel may be used.
	 *
	 * @var bool
	 */
	private $ready;

	/**
	 * Published allowance counts, each null where the service published none.
	 *
	 * @var array<string,int|null>
	 */
	private $figures;

	private function __construct( $ready, array $figures ) {
		$this->ready   = (bool) $ready;
		$this->figures = $figures;
	}

	/**
	 * Reads a decoded /v1/status body.
	 *
	 * @param mixed $payload Decoded JSON, or anything at all.
	 * @return self
	 */
	public static function from_payload( $payload ) {
		$status  = is_array( $payload ) ? $payload : array();
		$channel = isset( $status['wordpress_channel'] ) && is_array( $status['wordpress_channel'] ) ? $status['wordpress_channel'] : array();

		$ready = true === self::flag( $channel, 'enabled' )
			&& 'wordpress-v1' === self::text( $channel, 'credential_class' )
			&& 'tier3-cycle5-full' === self::text( $status, 'model' )
			&& 'segments-v3' === self::text( $status, 'segmentation_contract' )
			&& 'raw-v1' === self::text( $status, 'input_normalisation' )
			&& 'features-v1' === self::text( $status, 'features_contract' )
			&& 'margin-v1' === self::text( $status, 'scoring' );

		// The deployed service publishes the split under channel_allowance, with
		// one entry per surface. Reading it from there, and from the shapes the
		// design allowed for, means a rename on the service does not silently
		// turn every figure into a blank.
		$allowance = isset( $status['channel_allowance'] ) && is_array( $status['channel_allowance'] ) ? $status['channel_allowance'] : array();
		$channels  = isset( $allowance['channels'] ) && is_array( $allowance['channels'] ) ? $allowance['channels'] : array();
		$ours      = isset( $channels['wordpress'] ) && is_array( $channels['wordpress'] ) ? $channels['wordpress'] : array();

		return new self(
			$ready,
			array(
				// The share of the day's section readings reserved for WordPress.
				'channel_floor'         => self::first( array( self::number( $ours, array( 'floor', 'daily_floor', 'cap' ) ), self::number( $channel, array( 'daily_floor', 'floor', 'daily_cap', 'cap' ) ) ) ),
				'channel_remaining'     => self::first( array( self::number( $ours, array( 'floor_remaining_estimate', 'floor_remaining', 'remaining_estimate', 'remaining' ) ), self::number( $channel, array( 'floor_remaining', 'remaining', 'daily_remaining', 'remaining_estimate' ) ) ) ),
				// The pool every surface draws on once its own floor is spent.
				'shared_pool_remaining' => self::first( array( self::number( $allowance, array( 'shared_pool_remaining_estimate', 'shared_pool_remaining' ) ), self::nested_number( $status, 'shared_pool', array( 'remaining', 'remaining_estimate' ), array( 'service_daily_remaining_estimate' ) ) ) ),
				'shared_pool_cap'       => self::nested_number( $status, 'shared_pool', array( 'cap', 'daily_cap' ), array( 'service_daily_cap' ) ),
				// One site's own ceiling, in section readings rather than runs, so
				// a busy site cannot spend the whole reserved share.
				'site_per_hour'         => self::nested_number( $channel, 'per_site', array( 'per_site_inferences_per_hour', 'per_hour', 'hour' ), array( 'per_site_per_hour', 'site_per_hour' ) ),
				'site_per_day'          => self::nested_number( $channel, 'per_site', array( 'per_site_inferences_per_day', 'per_day', 'day' ), array( 'per_site_per_day', 'site_per_day' ) ),
				'resets_in_seconds'     => self::number( $status, array( 'resets_in_seconds' ) ),
			)
		);
	}

	/**
	 * The first figure that is actually a number.
	 *
	 * @param array<int,int|null> $candidates Values in order of preference.
	 * @return int|null
	 */
	private static function first( array $candidates ) {
		foreach ( $candidates as $candidate ) {
			if ( null !== $candidate ) {
				return $candidate;
			}
		}
		return null;
	}

	/**
	 * Rebuilds the object from the cached transient written by to_array().
	 *
	 * @param mixed $cached Whatever was in the transient.
	 * @return self|null Null when the cache holds nothing usable.
	 */
	public static function from_cache( $cached ) {
		if ( ! is_array( $cached ) || ! isset( $cached['ready'] ) ) {
			return null;
		}
		$figures = isset( $cached['figures'] ) && is_array( $cached['figures'] ) ? $cached['figures'] : array();
		$clean   = array();
		foreach ( self::figure_names() as $name ) {
			$value          = isset( $figures[ $name ] ) ? $figures[ $name ] : null;
			$clean[ $name ] = is_int( $value ) && $value >= 0 ? $value : null;
		}
		return new self( true === $cached['ready'], $clean );
	}

	/** A status that says nothing is available and publishes no figure. */
	public static function closed() {
		return new self( false, array_fill_keys( self::figure_names(), null ) );
	}

	public function ready() {
		return $this->ready;
	}

	/**
	 * One published figure, or null when the service did not send it.
	 *
	 * @param string $name One of figure_names().
	 * @return int|null
	 */
	public function figure( $name ) {
		return isset( $this->figures[ $name ] ) ? $this->figures[ $name ] : null;
	}

	/**
	 * Every published figure at once.
	 *
	 * @return array<string,int|null>
	 */
	public function figures() {
		return $this->figures;
	}

	/** The cacheable form. @return array */
	public function to_array() {
		return array(
			'ready'   => $this->ready,
			'figures' => $this->figures,
		);
	}

	/**
	 * The names of every figure this class reads.
	 *
	 * @return string[]
	 */
	public static function figure_names() {
		return array( 'channel_floor', 'channel_remaining', 'shared_pool_remaining', 'shared_pool_cap', 'site_per_hour', 'site_per_day', 'resets_in_seconds' );
	}

	private static function flag( array $source, $key ) {
		return isset( $source[ $key ] ) ? $source[ $key ] : null;
	}

	private static function text( array $source, $key ) {
		return isset( $source[ $key ] ) && is_string( $source[ $key ] ) ? $source[ $key ] : '';
	}

	/**
	 * The first whole, non-negative number found under any of these keys.
	 *
	 * A float is rounded down rather than refused, because a paced allowance is
	 * reported as an estimate and "3,999.6 left" is still three thousand nine
	 * hundred and ninety-nine. A string, a boolean or a negative value is not a
	 * count and comes back as null.
	 *
	 * @param array    $source Where to look.
	 * @param string[] $keys   Candidate key names, in order of preference.
	 * @return int|null
	 */
	private static function number( array $source, array $keys ) {
		foreach ( $keys as $key ) {
			if ( ! isset( $source[ $key ] ) || ! is_numeric( $source[ $key ] ) || is_string( $source[ $key ] ) || is_bool( $source[ $key ] ) ) {
				continue;
			}
			$value = (float) $source[ $key ];
			if ( $value < 0 || ! is_finite( $value ) ) {
				continue;
			}
			return (int) floor( $value );
		}
		return null;
	}

	/**
	 * A number that may sit inside a named sub-object or beside it.
	 *
	 * @param array    $source    Where to look.
	 * @param string   $group     The sub-object to try first.
	 * @param string[] $inner     Key names inside the sub-object.
	 * @param string[] $siblings  Key names to try on the source itself.
	 * @return int|null
	 */
	private static function nested_number( array $source, $group, array $inner, array $siblings ) {
		if ( isset( $source[ $group ] ) && is_array( $source[ $group ] ) ) {
			$found = self::number( $source[ $group ], $inner );
			if ( null !== $found ) {
				return $found;
			}
		}
		return self::number( $source, $siblings );
	}
}
