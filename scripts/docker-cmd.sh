docker_cmd() {
	if docker info >/dev/null 2>&1; then
		docker "$@"
	elif sudo -n docker info >/dev/null 2>&1; then
		sudo -n --preserve-env=APP_IMAGE,DEPLOY_ROOT docker "$@"
	else
		echo "Cannot access Docker daemon (add user to docker group or passwordless sudo)" >&2
		return 1
	fi
}
