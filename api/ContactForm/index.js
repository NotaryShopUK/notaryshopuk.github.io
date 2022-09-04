module.exports = async function (context, req) {
	context.log("JavaScript HTTP trigger function processed a request.");

	const { name, email, query } = req.body;
	const sanitise = (h) => h.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

	context.res = {
		status: 303,
		headers: {
			"Location": req.query.goto ?? "/",
		},
		body: "Redirecting...",
	};

	return {
		personalizations: [{
			to: [{ email: "dermot.winters@notaryshop.co.uk" }],
		}],
		from: { email: "api@notaryshop.co.uk" },
		subject: "Enquiry via contact form",
		content: [
			{
				type: "text/plain",
				value: [name, email, query].join("\r\n\r\n"),
			},
			{
				type: "text/html",
				value: [name, email, query]
					.map((s) => `<p>${sanitise(s)}</p>`)
					.join("\r\n\r\n"),
			},
		],
	};
}
