export const printApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.AGENT_API_KEY) {
        return res.status(400).json({ msg: 'API KEY INVALIDO'});
    };

    next();
}