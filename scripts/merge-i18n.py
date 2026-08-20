#!/usr/bin/env python3
import collections
import json
import sys


def deep_merge(dst, src):
	for key, value in src.items():
		if (
			isinstance(value, dict)
			and key in dst
			and isinstance(dst[key], dict)
		):
			deep_merge(dst[key], value)
		else:
			dst[key] = value


def main():
	if len(sys.argv) < 2:
		raise SystemExit("usage: merge-i18n.py <patch.json> [...]")
	for patch_path in sys.argv[1:]:
		with open(patch_path) as f:
			patch = json.load(f, object_pairs_hook=collections.OrderedDict)
		for locale, tree in patch.items():
			target = f"src/messages/{locale}.json"
			with open(target) as f:
				data = json.load(f, object_pairs_hook=collections.OrderedDict)
			deep_merge(data, tree)
			with open(target, "w") as f:
				json.dump(data, f, ensure_ascii=False, indent="\t")
				f.write("\n")
		print(f"merged {patch_path}")


if __name__ == "__main__":
	main()
