# Changelog

## [0.12.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.11.2...pearl-bdui-v0.12.0) (2026-04-25)


### Features

* **filters:** add No Parent property + Ready built-ins (beads-gui-5xy0) ([56607bd](https://github.com/htxryan/pearl/commit/56607bdaef47730dce8c783fd1219fa9c2936d63))


### Bug Fixes

* **backend:** address review findings for MEDIUMTEXT migration ([7b2a197](https://github.com/htxryan/pearl/commit/7b2a1971d62780ce46b074d7a6e2f0a4851eccce))
* **backend:** inline-mode image attachments fit in API and DB ([0557394](https://github.com/htxryan/pearl/commit/0557394a9546733bb839d1775c5d6d66adeb2450))
* **filters:** handle CLI parent-child deps in no_parent filter + add migration ([c5fdd5e](https://github.com/htxryan/pearl/commit/c5fdd5e8e158a4625f10f44fc52b4f726c17fb3a))
* **server:** make issue search case-insensitive ([e50f94f](https://github.com/htxryan/pearl/commit/e50f94f78eb66f4a3a359de6430e6940ef7eb33d))

## [0.11.2](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.11.1...pearl-bdui-v0.11.2) (2026-04-22)


### Bug Fixes

* **server:** run schema ensurer after pool is up (fresh bd-init OOB) ([#32](https://github.com/htxryan/pearl/issues/32)) ([8cf69f1](https://github.com/htxryan/pearl/commit/8cf69f1c462c221575c300e56b684da40aa75529))

## [0.11.1](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.11.0...pearl-bdui-v0.11.1) (2026-04-21)


### Bug Fixes

* **server:** run schema ensurer after pool is up (fresh bd-init OOB) ([#30](https://github.com/htxryan/pearl/issues/30)) ([dc3cb23](https://github.com/htxryan/pearl/commit/dc3cb23897488a9ac653be48c730ea30fcb043ba))

## [0.11.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.10.1...pearl-bdui-v0.11.0) (2026-04-21)


### Features

* image attachments, SQL writer, pearl-managed Dolt, and polish ([#18](https://github.com/htxryan/pearl/issues/18)) ([3dcac2a](https://github.com/htxryan/pearl/commit/3dcac2a547a0a4dbadf1956597d8b2bc5b59f7ca))

## [0.10.1](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.10.0...pearl-bdui-v0.10.1) (2026-04-16)


### Bug Fixes

* create label_definitions table before releasing sync barrier ([a660d8c](https://github.com/htxryan/pearl/commit/a660d8cb444bd90c2cfcf62a78edd72e09321c1c))


### Refactors

* extract label_definitions DDL to shared constant ([e82c941](https://github.com/htxryan/pearl/commit/e82c941ea4995cb38da4325b46e1d2eb1ba11169))

## [0.10.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.9.0...pearl-bdui-v0.10.0) (2026-04-16)


### Features

* OIDC publish with Node 24 ([ecfc874](https://github.com/htxryan/pearl/commit/ecfc874d8ff9a8c15de3a5fb8e3f551e280bdd56))

## [0.9.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.8.0...pearl-bdui-v0.9.0) (2026-04-16)


### Features

* final OIDC publish test ([0e2d0ab](https://github.com/htxryan/pearl/commit/0e2d0abaa37a87c5fa694e4bdcf9f8040b6bbd61))

## [0.8.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.7.0...pearl-bdui-v0.8.0) (2026-04-16)


### Features

* test OIDC publish without registry-url ([a225538](https://github.com/htxryan/pearl/commit/a225538d07556e122695f7e770a4946101e37c0a))

## [0.7.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.6.1...pearl-bdui-v0.7.0) (2026-04-16)


### Features

* verify OIDC publish pipeline ([f12af0f](https://github.com/htxryan/pearl/commit/f12af0f5dfa59c44e95c311e066bb425094648ed))

## [0.6.1](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.6.0...pearl-bdui-v0.6.1) (2026-04-16)


### Bug Fixes

* correct repository URL to htxryan/pearl for OIDC trusted publishing ([d506262](https://github.com/htxryan/pearl/commit/d5062629a28bfef820c7ffd3bc7a660e2dfeab01))

## [0.6.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.5.0...pearl-bdui-v0.6.0) (2026-04-16)


### Features

* test automated publish pipeline ([b52ce3b](https://github.com/htxryan/pearl/commit/b52ce3b84c763ef57ef35f69436b3f8cffdb7d36))

## [0.5.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.4.0...pearl-bdui-v0.5.0) (2026-04-16)


### Features

* trigger v0.5.0 release ([#8](https://github.com/htxryan/pearl/issues/8)) ([cdffda1](https://github.com/htxryan/pearl/commit/cdffda1b8df7ab3390e60252419249b54a10c4de))

## [0.4.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.3.0...pearl-bdui-v0.4.0) (2026-04-15)


### Features

* add tagline to CLI version output ([#6](https://github.com/htxryan/pearl/issues/6)) ([bf4fc52](https://github.com/htxryan/pearl/commit/bf4fc52169e0eeed56ca2064f10dd9495c6208e5))

## [0.3.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.2.0...pearl-bdui-v0.3.0) (2026-04-15)


### Features

* verify release-please publish pipeline ([#4](https://github.com/htxryan/pearl/issues/4)) ([b3ef04b](https://github.com/htxryan/pearl/commit/b3ef04b91d1dcaf6848b3d6442b6cebda044a4c4))

## [0.2.0](https://github.com/htxryan/pearl/compare/pearl-bdui-v0.1.0...pearl-bdui-v0.2.0) (2026-04-15)


### Features

* initial npm distribution of pearl-bdui ([#2](https://github.com/htxryan/pearl/issues/2)) ([f6bb4bf](https://github.com/htxryan/pearl/commit/f6bb4bf83bbc47c4d660dd07d63d316aeca2a878))
* Pearl npm distribution and release-please pipeline ([d9a6ece](https://github.com/htxryan/pearl/commit/d9a6ece0c56f149120960d20bfcd0d7f8838c8e8))


### Miscellaneous

* re-trigger release-please ([94c996a](https://github.com/htxryan/pearl/commit/94c996af67aca00ee415adc12cbe3949460fd8ae))

## This file intentionally left empty
