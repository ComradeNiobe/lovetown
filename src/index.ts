/*
 * @license
 * @copyright Copyright (C) 2025 Comrade Niobe
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
	ButtplugBrowserWebsocketClientConnector,
	ButtplugClient,
	type ButtplugClientDevice,
} from "buttplug";

interface LovetownOptions {
	/**
	 * The websocket connection string to the user's Intiface.
	 */
	connectAddress: string;
	/**
	 * How much time before the device stops.
	 */
	timeout: number;
	/**
	 * The vibration speed of a vibrator. [0.0 ~ 1.0]
	 */
	vibrate?: number | number[];
	/**
	 * Causes a device that supports linear movement to move to a position between [0.0 ~ 1.0] over a certain amount of time.
	 */
	linear?: number | [number, number][];
	/**
	 * Movement time in milliseconds.
	 */
	linearDuration?: number;
}

declare global {
	function lovetownSend(
		connectAddress: string,
		timeout: number,
		vibrate?: number,
		linear?: number | [number, number][],
		linearDuration?: number,
	);
	function lovetownConnect(cxt: LovetownOptions);
}

/**
 * The function that's used to call Lovetown from BYOND winset.
 * @param connectAddress - The websocket Intiface is running on.
 * @param timeout - Time until the action ends.
 * @param vibrate - Optional vibration action from [0.0 ~ 1.0].
 * @param linear - Optional linear action that can move between [0.0 ~ 1.0].
 * @param linearDuration - Optional time until the linear action reaches its destination.
 */
window.lovetownSend = async (
	connectAddress: string,
	timeout: number,
	vibrate?: number,
	linear?: number | [number, number][],
	linearDuration?: number,
) => {
	await lovetownConnect({
		connectAddress,
		timeout,
		vibrate,
		linear,
		linearDuration,
	});
};

window.lovetownConnect = async (cxt: LovetownOptions) => {
	// We construct it into a proper URL in case we want to manipulate it, like for validation and such.
	const connection_address = new URL(cxt.connectAddress);
	const client = new ButtplugClient("Lovetown Client");

	client.addListener("deviceadded", async (device: ButtplugClientDevice) => {
		if (cxt.vibrate) {
			if (device.vibrateAttributes.length > 0) {
				await device.vibrate(cxt.vibrate);

				// Now we set a timeout for 3 seconds in the future, to stop the device.
				setTimeout(async () => {
					await device.stop();
				}, cxt.timeout);
			}
		} else if (cxt.linear && cxt.linearDuration) {
			if (device.linearAttributes.length > 0) {
				await device.linear(cxt.linear, cxt.linearDuration);

				// Now we set a timeout for 3 seconds in the future, to stop the device.
				setTimeout(async () => {
					await device.stop();
				}, cxt.timeout);
			}
		}

		// At this point, let's just say we're done. Ask the server to stop scanning if it is currently doing so.
		await client.stopScanning();
	});

	client.addListener(
		"scanningfinished",
		async (device: ButtplugClientDevice) => {
			console.log("Scanning Finished");
		},
	);

	try {
		const connector = new ButtplugBrowserWebsocketClientConnector(
			connection_address.toString(),
		);
		await client.connect(connector);
	} catch (e) {
		console.log(e);
		return;
	}

	await client.startScanning();
};
