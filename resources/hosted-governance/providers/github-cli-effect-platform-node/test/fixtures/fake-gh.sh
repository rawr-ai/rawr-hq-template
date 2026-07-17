#!/bin/sh
set -eu

script_dir=${0%/*}
log_path="$script_dir/argv.log"
: > "$log_path"
endpoint=""
for argument in "$@"; do
  printf '%s\n' "$argument" >> "$log_path"
  endpoint=$argument
done

case "$endpoint" in
  repos/example/personal-rawr-hq/pulls/42/reviews?per_page=100)
    printf '%s' '[[{"id":9001,"state":"APPROVED","commit_id":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","user":{"login":"repository-owner"}},{"id":9002,"state":"CHANGES_REQUESTED","commit_id":"ffffffffffffffffffffffffffffffffffffffff","user":{"login":"repository-owner"}},{"id":9003,"state":"COMMENTED","commit_id":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","user":{"login":"review-observer"}}]]'
    ;;
  repos/example/personal-rawr-hq/pulls/43/reviews?per_page=100)
    printf '%s' 'not-json'
    ;;
  repos/example/personal-rawr-hq/pulls/44/reviews?per_page=100)
    printf '%s\n' 'authentication unavailable' >&2
    exit 13
    ;;
  repos/example/personal-rawr-hq/pulls/45/reviews?per_page=100)
    printf '%s' '[[{"id":"not-a-number","state":"APPROVED","commit_id":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","user":{"login":"repository-owner"}}]]'
    ;;
  repos/example/personal-rawr-hq/pulls/46/reviews?per_page=100)
    printf '%s' '[{"id":9001,"state":"APPROVED","commit_id":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","user":{"login":"repository-owner"}}]'
    ;;
  *)
    printf '%s\n' 'unexpected selector' >&2
    exit 64
    ;;
esac
