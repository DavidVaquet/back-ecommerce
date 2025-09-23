import { getSettingsByOrg } from "../models/settingsModel.js"
import { getSettingsFromCache, setSettingsCache } from "../utils/settingsCache.js";

export const loadSettings = async(req, res, next) => {
    try {
        const orgId = req.orgId;
        console.log(orgId);
        if (!orgId) return res.status(400).json({ msg: "org_id requerido" });
        const cached = getSettingsFromCache(orgId);

        if (cached) {
            req.settings = cached;
            return next();
        }

        const settings = await getSettingsByOrg(orgId);
        setSettingsCache(orgId, settings.data)
        req.settings = settings.data;
        return next();
    } catch (error) {
        next(error);
    }
}