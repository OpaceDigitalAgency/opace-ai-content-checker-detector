from __future__ import annotations

import os
import io
import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from opace_integrity.cycle5_model import ModelUnavailable
from opace_integrity.model_pack import _download_exact, install_model_pack, prepare_model_pack


class FakeResponse(io.BytesIO):
    def __init__(self, body: bytes, url: str, status: int = 200, length: int | None = None):
        super().__init__(body);self.status=status;self._url=url;self.headers={"Content-Length":str(len(body) if length is None else length)}
    def geturl(self):return self._url
    def __enter__(self):return self
    def __exit__(self,*_args):self.close()


class ModelPackTests(unittest.TestCase):
    def test_prepare_requires_consent_absolute_paths_and_exact_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);model=root/"model.onnx";vocab=root/"vocab.txt"
            model.write_bytes(b"not-the-model");vocab.write_bytes(b"not-the-vocab")
            destination=root/"prepared"
            with self.assertRaisesRegex(ModelUnavailable,"licence_acceptance"):
                prepare_model_pack(destination,model,vocab,"int8",False)
            with self.assertRaisesRegex(ModelUnavailable,"source_mismatch"):
                prepare_model_pack(destination,model,vocab,"int8",True)
            self.assertFalse(destination.exists())

    def test_install_has_no_egress_before_both_consents(self):
        with tempfile.TemporaryDirectory() as directory, patch("opace_integrity.model_pack._download_exact") as download:
            destination=Path(directory)/"cycle5"
            for download_consent,licence_consent in ((False,False),(True,False),(False,True)):
                with self.assertRaises(ModelUnavailable):
                    install_model_pack(destination,download_consent,licence_consent)
            download.assert_not_called()
            self.assertFalse(destination.exists())

    def test_failed_or_cancelled_install_leaves_no_partial_directory(self):
        for error in (ModelUnavailable("model_download_redirect_or_status_refused"),KeyboardInterrupt()):
            with self.subTest(error=type(error).__name__), tempfile.TemporaryDirectory() as directory:
                root=Path(directory);destination=root/"cycle5"
                def fail(_url,target,*_args):
                    target.write_bytes(b"partial")
                    raise error
                with patch("opace_integrity.model_pack._download_exact",side_effect=fail):
                    with self.assertRaises(type(error)):
                        install_model_pack(destination,True,True)
                self.assertFalse(destination.exists())
                self.assertEqual(list(root.iterdir()),[])

    def test_downloader_refuses_redirect_wrong_size_hash_and_timeout(self):
        url="https://opace.agency/models/local-signals-v1/vocab.txt";body=b"abc";digest=hashlib.sha256(body).hexdigest()
        cases=(
            FakeResponse(body,url+"?redirected=1"),
            FakeResponse(body,url,length=4),
            FakeResponse(body,url),
            TimeoutError("timeout"),
        )
        expectations=("redirect_or_status","size_mismatch","hash_mismatch","download_failed")
        for index,(response,expected) in enumerate(zip(cases,expectations)):
            with self.subTest(expected=expected),tempfile.TemporaryDirectory() as directory:
                context=patch("opace_integrity.model_pack._open_url",side_effect=response if isinstance(response,BaseException) else None,return_value=None if isinstance(response,BaseException) else response)
                with context, self.assertRaisesRegex(ModelUnavailable,expected):
                    _download_exact(url,Path(directory)/f"target-{index}",3,"0"*64 if expected=="hash_mismatch" else digest,1)
        with tempfile.TemporaryDirectory() as directory,patch("opace_integrity.model_pack._open_url") as opened,self.assertRaisesRegex(ModelUnavailable,"not_allowlisted"):
            _download_exact("https://opace.agency/models/local-signals-v1/../other.onnx",Path(directory)/"target",3,digest,1)
        opened.assert_not_called()

    @unittest.skipUnless(os.environ.get("OACI_TEST_CYCLE5_INT8_FILE") and os.environ.get("OACI_TEST_CYCLE5_VOCAB_FILE"),"set exact int8 model and vocabulary paths")
    def test_prepare_real_int8_pack_is_loadable_and_atomic(self):
        with tempfile.TemporaryDirectory() as directory:
            destination=Path(directory)/"cycle5"
            prepare_model_pack(destination,os.environ["OACI_TEST_CYCLE5_INT8_FILE"],os.environ["OACI_TEST_CYCLE5_VOCAB_FILE"],"int8",True)
            self.assertTrue(destination.joinpath("manifest.json").is_file())
            self.assertTrue(destination.joinpath("tier3-cycle5-full-e5small-int8-perchannel.onnx").is_file())
            with self.assertRaisesRegex(ModelUnavailable,"destination_exists"):
                prepare_model_pack(destination,os.environ["OACI_TEST_CYCLE5_INT8_FILE"],os.environ["OACI_TEST_CYCLE5_VOCAB_FILE"],"int8",True)


if __name__ == "__main__":
    unittest.main()
