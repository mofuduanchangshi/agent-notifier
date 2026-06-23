# Agent Notifier Mac Companion

Install this extension locally on macOS. The remote Agent Notifier extension calls its `agentNotifierMac.notify` command to display native macOS notifications with `osascript`.

Install the main Agent Notifier extension on the SSH remote side and this companion on the local Mac side.

Set `agentNotifierMac.deliveryMode` to `stickyAlert` if you want a modal macOS alert that stays until dismissed. Leave it as `notification` to use Notification Center banners.
