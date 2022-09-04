module.exports = async function (context, req) {
	context.log("JavaScript HTTP trigger function processed a request.");

	const { name, email, query } = req.body;

	context.res = {
		// status: 200, /* Defaults to 200 */
		body: "Hello!",
	};

	return {
		personalizations: [{
			to: [{ email: "dermot.winters@notaryshop.co.uk" }],
		}],
		from: { email: "api@notaryshop.co.uk" },
		subject: "Enquiry via contact form",
		content: [{
			type: "text/plain",
			value: [name, email, query].join("\r\n\r\n"),
		}],
	};
}
