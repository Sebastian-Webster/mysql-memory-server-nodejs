import fs from 'fs'
import { LinuxEtcOSRelease } from '../../types'

const file = fs.readFileSync('/etc/os-release', 'utf8')
const entries = file.split('\n')
const releaseDetails = {}
for (const entry of entries) {
    const [key, value] = entry.split('=')
    releaseDetails[key] = value
}

export default releaseDetails as LinuxEtcOSRelease;