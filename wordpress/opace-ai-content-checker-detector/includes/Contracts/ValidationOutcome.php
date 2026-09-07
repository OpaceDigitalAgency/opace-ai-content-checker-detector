<?php

declare(strict_types=1);

namespace Opace\ContentIntegrity\Contracts;

final class ValidationOutcome
{
    /** @var string[] */
    private $errors;

    /**
     * @param string[] $errors
     */
    public function __construct(array $errors = array())
    {
        $this->errors = array_values($errors);
    }

    public function isValid(): bool
    {
        return $this->errors === array();
    }

    /**
     * @return string[]
     */
    public function errors(): array
    {
        return $this->errors;
    }
}
