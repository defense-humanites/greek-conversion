"""Prepared options, converters, and the engine across processes, forks, and
the garbage collector. Each case runs in a subprocess with a time limit: a
regression would otherwise hang the test suite."""

import subprocess
import sys
import textwrap

import pytest

import greek_conversion as gc

ENGINES = gc._engine.ENGINES


def run(code: str, engine: str, timeout: float = 60) -> str:
    script = f"import greek_conversion as gc\ngc.set_engine({engine!r})\n" + textwrap.dedent(code)
    completed = subprocess.run(
        [sys.executable, "-c", script],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    assert completed.returncode == 0, completed.stderr
    return completed.stdout.strip()


@pytest.mark.parametrize("engine", ENGINES)
def test_collected_handles_do_not_block(engine):
    # Finalizers run in any thread, including mini-racer's own.
    output = run(
        """
        import gc as collector
        collector.set_threshold(1, 1, 1)

        class Cycle:
            def __init__(self):
                self.me = self
                self.prepared = gc.prepare_options(preset="iso-843-type-2")
                self.converter = gc.create_converter(preset="sbl-general")

        for _ in range(1500):
            Cycle()
            gc.convert("Θεσσαλονίκη", "greek", "transliteration")
        print("ok")
        """,
        engine,
    )
    assert output == "ok"


# Forking a process with threads is reliable on Linux only.
LINUX_ONLY = pytest.mark.skipif(sys.platform != "linux", reason="fork on Linux only")


@pytest.mark.parametrize("engine", ENGINES)
@LINUX_ONLY
def test_fork(engine):
    output = run(
        """
        import os
        prepared = gc.prepare_options(preset="iso-843-type-2")
        gc.convert("λ", "greek", "beta-code")
        read, write = os.pipe()
        pid = os.fork()
        if pid == 0:
            os.close(read)
            out = gc.convert("Θεσσαλονίκη", "greek", "transliteration", prepared)
            os.write(write, out.encode())
            os._exit(0)
        os.close(write)
        child = os.read(read, 100).decode()
        os.waitpid(pid, 0)
        print(child, gc.convert("Θεσσαλονίκη", "greek", "transliteration", prepared))
        """,
        engine,
    )
    assert output == "Thessaloníki Thessaloníki"


@pytest.mark.parametrize("engine", ENGINES)
@pytest.mark.parametrize("method", ["fork", "spawn"])
def test_multiprocessing(engine, method):
    import multiprocessing

    if method == "fork" and sys.platform != "linux":
        pytest.skip("fork on Linux only")
    if method not in multiprocessing.get_all_start_methods():
        pytest.skip(f"no {method}")
    output = run(
        f"""
        import multiprocessing

        if __name__ == "__main__":
            prepared = gc.prepare_options(preset="iso-843-type-2")
            converter = gc.create_converter(preset="iso-843-type-2")
            gc.convert("λ", "greek", "beta-code")
            other = gc.prepare_options(preset="tlg-core")
            with multiprocessing.get_context({method!r}).Pool(2) as pool:
                outputs = pool.starmap(
                    gc.convert,
                    [("Θεσσαλονίκη", "greek", "transliteration", prepared)] * 4,
                )
                outputs += pool.starmap(
                    converter.convert, [("Θεσσαλονίκη", "greek", "transliteration")] * 2
                )
            print(" ".join(sorted(set(outputs))))
        """,
        engine,
        timeout=120,
    )
    assert output == "Thessaloníki"
