# Support for MySQL binary downloads

*Keep in mind that this information only applies to support provided by ```mysql-memory-server``` for versions of MySQL that it downloads from the MySQL CDN. This section <ins>does not apply</ins> to versions of MySQL that are already installed on your system.*

## Supported operating systems

- macOS
- Windows
- Linux

*```mysql-memory-server``` gets tested on Ubuntu 22.04 (x64 and arm64) and 24.04 (x64 and arm64), Fedora 41 (x64 and arm64) and 42 (x64 and arm64), Alpine 3.22 (x64 and arm64), macOS 14 (arm64), and 15 (arm64), Windows 11 (arm64), and Windows Server 2022 (x64) and 2025 (x64). Linux distributions and Windows and macOS versions other than the ones tested may or may not work and are not guaranteed to work with this package.*

## Binaries not available for download

- Versions 8.0.29, 8.0.38, 8.4.1, and 9.0.0 are not available for download for any operating systems as MySQL removed them from the CDN due to critical issues.

- Versions 5.7.32 - 5.7.44 are not available for download only for macOS systems as MySQL stopped supporting macOS Mojave starting from 5.7.32 for the rest of the 5.7.x line. As a result, those versions are not available for macOS in the MySQL CDN.

## Alpine Linux Limitations

Only MySQL versions 8.4.x and 9.x can be downloaded and ran with this package on Alpine Linux. The binaries for Alpine Linux are sourced from [Sebastian-Webster/mysql-server-musl-binaries](https://github.com/Sebastian-Webster/mysql-server-musl-binaries) on GitHub as Oracle does not support MySQL on musl-based Linux distributions. That repository only has support for MySQL 8.4.x and 9.x. If you discover any issues with MySQL (and not this package) when you are running this on Alpine Linux, please report the issue on that repository and not the ```mysql-memory-server``` one. The MySQL X Plugin is also not available when running on Alpine Linux due to compilation errors for musl.

## Native Binary Architectures

*Architectures used can be overridden by the ```arch``` option provided your OS and system supports running applications that use those architectures.*

Linux, Windows, macOS x64: MySQL v5.7.19 - v9.4.0

Linux ARM64: MySQL v8.0.31 - v9.4.0

macOS ARM64: MySQL v8.0.26 - v9.4.0

Windows ARM64: N/A - Read about the ```arch``` option to run this package on your system

## Operating System Minimum Version Requirements

Windows - No documented minimum version

Linux - No documented minimum version

macOS:

| MySQL Version (inclusive) | macOS Minimum Version |
|--|--|
| v8.0.0 | OS X 10.9 (Mavericks) |
| v5.7.19 - v5.7.23 OR v8.0.1 - v8.0.3 OR v8.0.11 - v8.0.12  | macOS 10.12 (Sierra) |
| v5.7.24 - v5.7.29 OR v8.0.4 OR v8.0.13 - v8.0.18 | macOS 10.13 (High Sierra) |
| v5.7.30 - v5.7.31 OR v8.0.19 - v8.0.22 | macOS 10.14 (Mojave) |
| v8.0.23 - v8.0.27 | macOS 10.15 (Catalina) |
| v8.0.28 - v8.0.31 | macOS 11 (Big Sur) |
| v8.0.32 - v8.0.34 | macOS 12 (Monterey) |
| v8.0.35 - v8.0.39 OR v8.1.0 - v8.4.2 OR v9.0.1 | macOS 13 (Ventura) |
| v8.0.40 - v8.0.43 OR v8.4.3 - v8.4.6 OR v9.1.0 - v9.4.0 | macOS 14 (Sonoma) |

## Operating System Maximum Version Requirements

*The newest operating system you can run with x MySQL version*

Windows - No documented maximum version

macOS - No documented maximum version

Fedora & Alpine Linux - No documented maximum version

Ubuntu Linux:

| MySQL version | Maximum Ubuntu Version |
|--|--|
| >= v8.0.4 | No documented maximum version |
| <= v8.0.3 | Ubuntu 23.10 |

## Required Dependencies

macOS - None

Windows:

| MySQL Version | Required Dependencies |
|--|--|
| <= v5.7.37 | Microsoft Visual C++ 2013 Redistributable Package |
| v5.7.38 & v5.7.39 | Microsoft Visual C++ 2013 Redistributable Package AND Microsoft Visual C++ 2019 Redistributable Package|
| >= v5.7.40 | Microsoft Visual C++ 2019 Redistributable Package |

Ubuntu Linux:

| Ubuntu Version | Required Dependencies |
|--|--|
| >= v24.04 | ```libaio1t64``` package, ```tar``` package, and ```ldconfig``` command |
| <= v23.10 | ```libaio1``` package and ```tar``` package |

Fedora Linux: ```libaio1``` package and ```tar``` package

Alpine Linux: ```libstdc++``` package, ```libaio``` package, and ```tar``` package

*Document last updated in v1.12.1*