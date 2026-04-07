"use strict";

import nodemailer from "nodemailer";

export const sendEmail = async (from: string, to: string, subject: string, body: string) => {
	const transport = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: +(process.env.SMTP_PORT as string),
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_KEY
		}
	});
	try {
		return (await transport.verify()) && (await transport.sendMail({ from, to, subject, html: body }));
	} catch {
		return false;
	}
};