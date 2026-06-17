#!/usr/bin/env bash
set -euo pipefail

resource_group=""
function_app=""
storage_account="${ELDORIA_STORAGE_ACCOUNT:-}"
container_name="${ELDORIA_CHARACTER_CONTAINER:-eldoria-character-data}"
catalog_table="${ELDORIA_CATALOG_TABLE:-eldoriacatalog}"
blob_prefix="${ELDORIA_BLOB_PREFIX:-}"
allowed_origins="${ELDORIA_ALLOWED_ORIGINS:-*}"
subscription=""
storage_connection_string="${ELDORIA_STORAGE_CONNECTION_STRING:-}"
assign_storage_role="false"

usage() {
  cat <<'EOF'
Deploy the Eldoria API to an existing Azure Function App.

Required:
  --resource-group <name>
  --function-app <name>

Auth:
  --storage-account <name>          Use managed identity with this Storage account.
  --storage-connection-string <val> Use connection-string auth instead.

Options:
  --container <name>
  --catalog-table <name>
  --blob-prefix <path>
  --allowed-origins <origins>
  --subscription <id-or-name>
  --assign-storage-role
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --resource-group) resource_group="$2"; shift 2 ;;
    --function-app) function_app="$2"; shift 2 ;;
    --storage-account) storage_account="$2"; shift 2 ;;
    --container) container_name="$2"; shift 2 ;;
    --catalog-table) catalog_table="$2"; shift 2 ;;
    --blob-prefix) blob_prefix="$2"; shift 2 ;;
    --allowed-origins) allowed_origins="$2"; shift 2 ;;
    --subscription) subscription="$2"; shift 2 ;;
    --storage-connection-string) storage_connection_string="$2"; shift 2 ;;
    --assign-storage-role) assign_storage_role="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$resource_group" || -z "$function_app" ]]; then
  usage
  exit 1
fi

if [[ -z "$storage_account" && -z "$storage_connection_string" ]]; then
  echo "Set --storage-account for managed identity auth, or --storage-connection-string for connection string auth." >&2
  exit 1
fi

command -v az >/dev/null || { echo "Required command not found: az" >&2; exit 1; }
command -v npm >/dev/null || { echo "Required command not found: npm" >&2; exit 1; }
command -v zip >/dev/null || { echo "Required command not found: zip" >&2; exit 1; }

sync_function_app_cors() {
  local origins="$1"
  local raw_origin
  local origin
  local has_wildcard="false"

  IFS=',' read -ra origin_list <<< "$origins"
  for raw_origin in "${origin_list[@]}"; do
    origin="$(printf '%s' "$raw_origin" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    if [[ "$origin" == "*" ]]; then
      has_wildcard="true"
      break
    fi
  done

  if [[ "$has_wildcard" == "true" ]]; then
    az functionapp cors remove \
      --resource-group "$resource_group" \
      --name "$function_app" \
      --allowed-origins >/dev/null

    az functionapp cors add \
      --resource-group "$resource_group" \
      --name "$function_app" \
      --allowed-origins "*" >/dev/null
    return
  fi

  for raw_origin in "${origin_list[@]}"; do
    origin="$(printf '%s' "$raw_origin" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    if [[ -n "$origin" ]]; then
      az functionapp cors add \
        --resource-group "$resource_group" \
        --name "$function_app" \
        --allowed-origins "$origin" >/dev/null
    fi
  done
}

if [[ -n "$subscription" ]]; then
  az account set --subscription "$subscription"
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
api_root="$(cd "$script_dir/.." && pwd)"
deploy_root="$api_root/.deploy"
stage_root="$deploy_root/package"
zip_path="$deploy_root/eldoria-character-api.zip"

rm -rf "$stage_root"
mkdir -p "$stage_root" "$deploy_root"

cp "$api_root/host.json" "$stage_root/"
cp "$api_root/package.json" "$stage_root/"
if [[ -f "$api_root/package-lock.json" ]]; then
  cp "$api_root/package-lock.json" "$stage_root/"
fi
cp -R "$api_root/src" "$stage_root/"

(
  cd "$stage_root"
  if [[ -f package-lock.json ]]; then
    npm ci --omit=dev
  else
    npm install --omit=dev
  fi
)

rm -f "$zip_path"
(
  cd "$stage_root"
  zip -qr "$zip_path" .
)

settings=(
  "ELDORIA_CHARACTER_CONTAINER=$container_name"
  "ELDORIA_CATALOG_TABLE=$catalog_table"
  "ELDORIA_ALLOWED_ORIGINS=$allowed_origins"
)

if [[ -n "$storage_connection_string" ]]; then
  settings+=("ELDORIA_STORAGE_CONNECTION_STRING=$storage_connection_string")
else
  settings+=("ELDORIA_STORAGE_ACCOUNT=$storage_account")
fi

if [[ -n "$blob_prefix" ]]; then
  settings+=("ELDORIA_BLOB_PREFIX=$blob_prefix")
fi

az functionapp config appsettings set \
  --resource-group "$resource_group" \
  --name "$function_app" \
  --settings "${settings[@]}" >/dev/null

sync_function_app_cors "$allowed_origins"

if [[ "$assign_storage_role" == "true" ]]; then
  if [[ -z "$storage_account" ]]; then
    echo "--assign-storage-role requires --storage-account." >&2
    exit 1
  fi

  principal_id="$(az functionapp identity assign \
    --resource-group "$resource_group" \
    --name "$function_app" \
    --query principalId \
    --output tsv)"

  scope="$(az storage account show \
    --resource-group "$resource_group" \
    --name "$storage_account" \
    --query id \
    --output tsv)"

  az role assignment create \
    --assignee "$principal_id" \
    --role "Storage Blob Data Contributor" \
    --scope "$scope" >/dev/null

  az role assignment create \
    --assignee "$principal_id" \
    --role "Storage Table Data Contributor" \
    --scope "$scope" >/dev/null
fi

az functionapp deployment source config-zip \
  --resource-group "$resource_group" \
  --name "$function_app" \
  --src "$zip_path" >/dev/null

echo "Deployed $zip_path to $function_app."
