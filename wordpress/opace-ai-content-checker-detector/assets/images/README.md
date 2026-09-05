# Runtime product mark

The admin screens now use `opace-ai-content-checker-mark.png`: the same approved wordless magnifier-and-tick mark as Chrome, copied byte-for-byte from its 128 × 128 build derivative. SHA-256: `71c6585da69368d6ab0ea72e33102c26224669482124591f0a831b4bae65b389`. Source master: `docs/assets/opace-ai-checker-chrome-mark-v4.png`. The former assets below are retained for existing report references, not used by the admin headers.

`opace-ai-content-checker-detector-logo-256.webp` is a 256 × 256 lossless WebP derivative of the canonical wordless raster asset `docs/assets/opace-ai-content-checker-detector-logo-v3.png`.

- canonical source SHA-256: `cee92ccc36ae18bef908fa536f370792b4034b6d0446b18b83a028ac12a42e37`
- runtime derivative SHA-256: `80fac5dd729d89d0469d922292bbbf1b31142560f94d8a8168e0c4f107041244`
- transformation: resize the canonical 1024 × 1024 PNG to 256 × 256, then encode it with lossless WebP compression

The runtime never imports the WordPress.org directory-assets folder. The adjacent HTML heading remains the accessible product name; the image has an empty alternative because its wording would otherwise be repeated.

`opace-ai-content-checker-detector-logo-256.jpg` is an 86-quality JPEG derivative of the same runtime WebP, used only as the locally embedded complete-PDF mark because PDF 1.4 supports JPEG natively.

- PDF derivative SHA-256: `876f9aeaf7722e4ee4ce72e5dabeb8be6654c5e755fe29e12b10b8b6c7f129c1`
- dimensions: 256 × 256
