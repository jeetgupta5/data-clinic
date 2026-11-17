import unittest
from dataclinic.profile import inspect_csv


class ProfileTests(unittest.TestCase):
    def test_missing_and_duplicates(self):
        report = inspect_csv(b"name,age\nAlice,22\nAlice,22\nBob,NA\n")
        self.assertEqual(report["duplicate_rows"], 1)
        self.assertEqual(report["missing_cells"], 1)
        self.assertEqual(report["column_profiles"][1]["type"], "numeric")

    def test_quoted_newlines_and_bom(self):
        report = inspect_csv('\ufeffname,note\nAlice,"hello,\nworld"\n'.encode())
        self.assertEqual(report["rows"], 1)

    def test_invalid_shapes_and_headers(self):
        for data in [b"a,b\n1\n", b"a,a\n1,2\n", b"a, a\n1,2\n", b"a,b\n", b"", b'a\n"unfinished']:
            with self.subTest(data=data), self.assertRaises(ValueError):
                inspect_csv(data)

    def test_mixed_types_and_nonfinite(self):
        result = inspect_csv(b"a,b\n22,inf\n22 years,2\n")
        self.assertEqual(result["column_profiles"][0]["numeric_like_cells"], 1)
        self.assertEqual(result["column_profiles"][1]["type"], "text")

    def test_outlier(self):
        report = inspect_csv(b"value\n1\n2\n3\n4\n5\n100\n")
        self.assertEqual(report["column_profiles"][0]["statistics"]["outliers"], 1)

    def test_empty_column(self):
        report = inspect_csv(b"a,b\nNA,x\nnull,y\n")
        self.assertEqual(report["column_profiles"][0]["type"], "empty")

    def test_zero_iqr(self):
        report = inspect_csv(b"a\n1\n1\n1\n1\n100\n")
        self.assertEqual(report["column_profiles"][0]["statistics"]["outliers"], 0)

    def test_encoding(self):
        with self.assertRaises(ValueError):
            inspect_csv(b"name\n\xff\n")


if __name__ == "__main__":
    unittest.main()
