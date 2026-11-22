.DEFAULT_GOAL := help

NPM ?= npm

.PHONY: help setup install browser run demo build test check test-report

help:
	@echo 'make setup       Install dependencies and Chromium'
	@echo 'make run         Start the frontend'
	@echo 'make demo        Start the frontend on 127.0.0.1'
	@echo 'make build       Type-check and build the frontend'
	@echo 'make test        Run all Playwright tests'
	@echo 'make check       Build and run all Playwright tests'
	@echo 'make test-report Open the Playwright HTML report'

setup: install
	$(MAKE) browser

install:
	$(NPM) ci

browser:
	$(NPM) exec -- playwright install chromium

run:
	$(NPM) run dev

demo:
	$(NPM) run dev -- --host 127.0.0.1

build:
	$(NPM) run build

test:
	$(NPM) test

check: build
	$(MAKE) test

test-report:
	$(NPM) exec -- playwright show-report
