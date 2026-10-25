// After `expo prebuild`: sign release builds with the Play upload key instead of the debug key.
// Reads the keystore path and password from env (set by the workflow from repository secrets).
const fs = require('fs');
const f = 'android/app/build.gradle';
let s = fs.readFileSync(f, 'utf8');
s = s.replace(/signingConfigs \{/, `signingConfigs {
        release {
            storeFile file(System.getenv('UPLOAD_STORE_FILE'))
            storePassword System.getenv('UPLOAD_KEYSTORE_PASSWORD')
            keyAlias 'upload'
            keyPassword System.getenv('UPLOAD_KEYSTORE_PASSWORD')
        }`);
// newer prebuild templates write `signingConfig = signingConfigs.debug`
const rel = s.indexOf('release {', s.indexOf('buildTypes'));
const m = rel < 0 ? null : /signingConfig\s*=?\s*signingConfigs\.debug/.exec(s.slice(rel));
if (!m) throw new Error('release build type not found in ' + f);
const end = rel + m.index;
s = s.slice(0, end) + 'signingConfig signingConfigs.release' + s.slice(end + m[0].length);
// Play needs a higher versionCode on every upload: use the build number
if (process.env.GITHUB_RUN_NUMBER) s = s.replace(/versionCode \d+/, 'versionCode ' + process.env.GITHUB_RUN_NUMBER);
fs.writeFileSync(f, s);
console.log('release builds signed with the upload key');
