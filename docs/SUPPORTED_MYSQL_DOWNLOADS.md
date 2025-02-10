## Support for MySQL binary downloads

*Keep in mind that this section is only for support provided by ```mysql-memory-server``` for versions of MySQL that it downloads from the MySQL CDN. This section does not apply to versions of MySQL that are already installed on your system.*

#### Binaries not available for download

- Versions 8.0.29, 8.0.38, 8.4.1, and 9.0.0 are not available for download for any operating systems as MySQL removed them from the CDN due to critical issues.

- Versions 5.7.32 - 5.7.44 are not available for download only on macOS as MySQL stopped supporting macOS Mojave starting from 5.7.32 for the rest of the 5.7.x line.

#### Native Binary Architectures

*Architectures used can be overridden by the ```arch``` option provided your OS and system supports running applications that use those architectures.*

Linux, Windows, macOS x64: MySQL v5.7.19 - v9.2.0

Linux ARM64: MySQL v8.0.31 - v9.2.0

macOS ARM64: MySQL v8.0.26 - v9.2.0

Windows ARM64: N/A - Read about the ```arch``` option to run this package on your system

#### Operating System Minimum Version Requirements

Windows - No documented minimum version

Linux - No documented minimum version

macOS:



*Document last updated in v1.9.0*