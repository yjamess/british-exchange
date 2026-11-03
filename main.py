"""CLI entry — prefer the API for serving Ready indicators."""


def main() -> None:
    print("Britain Exchange")
    print("API:  uv run uvicorn britain_exchange.api:app --reload")
    print("Docs: http://127.0.0.1:8000/docs")


if __name__ == "__main__":
    main()
