s/(Authorization:[[:space:]]*Bearer[[:space:]]+)[A-Za-z0-9._~+\/=:-]+/\1[REDACTED]/Ig
s/((api|access|refresh)[_-]?(key|token)["=:[:space:]]+)[^ ,"}]+/\1[REDACTED]/Ig
s/(Bearer[[:space:]]+)[A-Za-z0-9._~+\/=:-]+/\1[REDACTED]/Ig
