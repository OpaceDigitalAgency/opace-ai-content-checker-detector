<?php

declare(strict_types=1);

namespace Opace\ContentIntegrity\Contracts\WordPress;

interface PublicApiContract
{
    public function version();

    public function is_compatible($constraint);

    public function capabilities();

    public function register_source_adapter(SourceAdapterContract $adapter);

    public function create_session(array $request);

    public function get_session($uuid);

    public function approve($uuid, array $selection);

    public function get_approved_output($uuid, $receipt_uuid);

    public function mark_applied($uuid, $receipt_uuid, $output_hash);

    public function get_receipt($uuid);

    public function asset_handles();
}
