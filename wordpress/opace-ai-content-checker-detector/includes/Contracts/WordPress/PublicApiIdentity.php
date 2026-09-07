<?php

declare(strict_types=1);

namespace Opace\ContentIntegrity\Contracts\WordPress;

final class PublicApiIdentity
{
    public const API_VERSION = '1.0';
    public const FACADE_CLASS = 'Opace\\ContentIntegrity\\Integration\\PublicApi';
    public const INSTANCE_METHOD = 'instance';
    public const READY_HOOK = 'oaci_ready';

    public const PUBLIC_METHODS = array(
        'version',
        'is_compatible',
        'capabilities',
        'register_source_adapter',
        'create_session',
        'get_session',
        'approve',
        'get_approved_output',
        'mark_applied',
        'get_receipt',
        'asset_handles',
    );
}
