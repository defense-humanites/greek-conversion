"""The examples of the README, which PyPI shows, run as doctests."""

import doctest
from pathlib import Path

import pytest

import greek_conversion as gc

README = Path(__file__).resolve().parent.parent / "README.md"


@pytest.mark.parametrize("engine", gc._engine.ENGINES)
def test_readme_examples(engine):
    gc.set_engine(engine)
    try:
        result = doctest.testfile(str(README), module_relative=False)
    finally:
        gc.set_engine(None)
    assert result.attempted > 10
    assert result.failed == 0
