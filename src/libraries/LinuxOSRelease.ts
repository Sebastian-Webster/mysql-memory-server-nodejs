import fs from 'fs'
import { LinuxEtcOSRelease } from '../../types'

const releaseDetails = {}

if (process.platform === 'linux') {
    const file = fs.readFileSync('/etc/os-release', 'utf8')
    const entries = file.split('\n')
    for (const entry of entries) {
        const [key, value] = entry.split('=')
        if (typeof key === 'string' && typeof value === 'string') {
            releaseDetails[key] = value.replaceAll('"', '')
        }
    }
}

export default releaseDetails as LinuxEtcOSRelease;