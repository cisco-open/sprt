# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

- `Added` - for new features.
- `Changed` - for changes in existing functionality.
- `Deprecated` - for soon-to-be removed features.
- `Removed` - for now removed features.
- `Fixed` - for any bug fixes.
- `Security` - in case of vulnerabilities.

## 1.4.2 - 2024-09-17

### Changed

- Use TCP connection instead of UNIX socket

## 1.4.1 - 2024-07-10

### Fixed

- No syslog messages during scheduled EAP-TLS jobs

## 1.4.0 - 2024-06-02

### Added

- Report `protocol` and `method` in syslog messages

## 1.3.9 - 2024-05-14

### Changed

- Use `Daemon::Control` instead of `MooseX::Daemonize` to fork processes

## 1.3.2 - 2024-03-06

### Fixed

- Inability to execute stored jobs if they were initially created through API

## 1.3.0 - 2024-01-08

### Added

- Ability to get API token in "one user" mode using credentials (API: `/api-settings/token`)

## 1.2.2 - 2023-08-09

### Fixed

- "Validate server" in PEAP and EAP-TLS fails (#154)
- Skip any cert verification in guest flows

## 1.2.1 - 2023-08-08

### Fixed

- Allow weak ciphers for EAP-TLS in dockerised version

## 1.2.0 - 2023-07-19

### Added

- Support global remote syslog

## 1.1.2 - 2023-06-28

### Fixed

- Correct the name of sessions manipulation tab (#146)
- Typo in Pattern-based MAC addr description (#147)
- Login migrated to DUO

## 1.1.1 - 2020-07-09

### Fixed

- PEAP auto amount seems to be not working (#143)

## 1.1.0 - 2020-07-01

### Added

- Move to new oauth (#141)

## 1.0.0 - 2020-05-27

### Added

- Badge for running jobs
- Re-design of RADIUS/TACACS+ flows
- Allow to specify super users from configurator (#137)
- Ask for super password during configuration (#138)

### Fixed

- configurator warnings (#136)
- configurator exits after FQDN (#135)

## 0.9.2 - 2020-05-07

### Added

- Send Interim Updates to different server (#19)
- Check for new versions (#132)
- Rework RADIUS flows
- Rework SCEP integration UI

### Fixed

- MAC patterns broken (#131)
- EAP-TLS gets frozen intermittently with SCEP (#130)
- Exceptions during PEAP (#129)
- SCEP exceptions not shown to user during integration (#127)
- Logs should have pagination (#124)

## 0.9.1 - 2020-04-21

### Fixed

- Cron not saved in Dockerized SPRT (#126)
- Docker SPRT is in debug mode by default (#125)
- Empty directories are not removed in logs folder (#115)

## 0.9.0 - 2020-04-04

### Added

- API support (#116)
- Login as admin for one user mode (#123)

### Fixed

- Remove dependencies.json from config (#122)
- PEAP/EAP-TLS got frozen if packets dropped (#121)
- Modal do not disappear when uploading certificates (#120)
- Connection Type is not populated from defaults (#117)
- Replace "build" with "image" in docker-compose (#119)

## 0.8.0 - 2020-01-11

### Added

- PEAP + MSCHAPv2 (#13)
- Negotiate EAP meathod if not expected received in challenge (#112)

## 0.7.0 - 2019-12-16

### Added

- Scheduler (#103)
- Add timestamps to graphs (#106 by Serhii Kucherenko)
- Multi-thread option for RADIUS Accounting (#110)

### Fixed

- If certificate file is missing, do not show it as selectable on generate page (#104 by Zaid Al-Kurdi)
- Guest got broken after adding TACACS (#107)

## 0.6.5 - 2019-11-25

### Added

- Auto clean-ups (#91)

### Fixed

- Threads eat 10+ Gigs and die then (memory leaks) (#102)

## 0.6.4 - 2019-11-18

### Fixed

- Shouldn't crash if cannot open certificate file (#97 by Zaid Al-Kurdi)
- Disallow reuse of MAC address doesn't work well with pattern-based MACs (#99 by Zaid Al-Kurdi)
- Async breaks randomly on big amount of sessions (30k+) (#100 by Serhii Kucherenko)

## 0.6.3 - 2019-11-01

### Added

- EAP-TLS improvements (2-3 times faster) (#94)

### Fixed

- Async with EAP-TLS stops after 8 sessions (#95)
- EAP-TLS prohibit 0 ciphers selection (#93)
- EAP-TLS should warn if no SCEP selected (#84)

## 0.6.2 - 2019-10-23

### Added

- Show expired certificates (#92)

### Fixed

- Wrong serializer for form-data

## 0.6.1 - 2019-10-21

### Added

- Docker support (#62)
- Show if RADIUS/TACACS enabled (#86)

### Fixed

- Error on servers page when 0 servers (#89)
- Acct-Session-Time specified doesn't work on Drop (#40)

## 0.6.0 - 2019-10-15

### Added

- TACACS+ support (#57)

## 0.5.7 - 2019-07-24

### Added

- ANC pxGrid functionality for sessions (#83)

## 0.5.6 - 2019-07-17

### Added

- Removable Calling-Station-Id (#82)

## 0.5.5 - 2019-07-16

### Added

- Integrate pxGrid GUI (#79)

### Fixed

- Shouldn't show error if 0 servers found (#81)

## 0.5.4 - 2019-07-11

### Added

- Editable Session-ID (#47)

### Fixed

- Unrecognised protocol udp (#78)
- Charts do not work (#77)
- Interim Updates breaks on big amount of sessions (#58)

## 0.5.3 - 2019-07-09

### Fixed

- Wide character issue with non-English portals (#73)
- Ranges do not always work (#74)
- Calling-Station-ID is not sent in Accounting requests (#76)
- selected sessions not cleared after successful interim-update (#60)

## 0.5.2 - 2019-06-06

### Fixed

- Multiple Cisco-AVPair:audit-session-id after multiple reauth CoA (#68)
- Hash symbol should not be allowed in bulk (#70)
- CHAP should not be enabled by default (#72)

## 0.5.1 - 2019-06-01

### Added

- Added CHAP support (#69)

### Fixed

- Change "process name" to "job name" in alert (#67)

## 0.5.0 - 2019-02-09

- Guest flows support (#16)
- Audit Session ID (Cisco-AVPair) now saved (#17, Serhii Kucherenko)
- ASA Dictionary added by default (#64, Jacob Klitzke)
- Load DACLs from ACCESS-ACCEPT (#54)
- Statistics and graphs added to jobs (#48, Serhii Kucherenko)
- Option "specified usernames" for EAP-TLS added when selected certificates used (#37)
- Dictionaries added
- Redis queue for jobs
- Code optimisation and clean-up
- Tuned GUI

## 0.4.5

- Configurable timeouts and retransmits (#55, Serhii Kucherenko)

## 0.4.4a

- Bugs fixed - #39, #56

## 0.4.4 - 2018-12-10

- Added support of IPv6 for RADIUS
- Select source interface from GUI (#36)

## 0.4.3

- Added support for additional RADIUS dictionaries (#43, Juan Ponce Dominguez)

## 0.4.1

- User preferences (#42, Eugene Korneychuk & #41, Anastasiya Volkova)
- GUI tune
- Bug fixes (#25, #23)
- Improvements on control script

## 0.4.0 - 2018-08-17

- CoA support
- Friendly Name for servers (#38, Eugene Korneychuk)

## 0.3.6 - 2018-07-19

- Saved RADIUS Servers (#14, Anastasiya Volkova)
- Bug fixes

## 0.3.5 - 2018-07-12

- Re-design of protocols selection

## 0.3.4 - 2018-07-11

- Upgrade support (#26, Clark Gambrel)

## 0.3.3

- Control script

## 0.3.2

- Single-user deployment option
- IP address generate rules

## 0.3.1

- Bug fixes

## 0.3.0 - 2018-03-02

- EAP-TLS support
- Renamed to SPRT
- UI changes
- Jobs improvements
- A lot of bug fixes and changes in backend
