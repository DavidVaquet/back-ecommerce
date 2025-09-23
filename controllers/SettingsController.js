import { getCompanySettings, editCompanySettings, editInventorySettings, editSalesSettings } from "../models/settingsModel.js";
import { invalidateSettingsCache } from "../utils/settingsCache.js";

export const gtCompanySettings = async (req, res) => {

    try {
        const orgId = req.orgId;
        const settings = await getCompanySettings(orgId);
        if (!settings) {
            return res.status(400).json({msg: 'Error al obtener los datos.'});
        }

        return res.status(200).json(settings);
    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: 'Error al obtener los datos'});
    }
}

export const patchSettingsCompany = async (req, res) => {

    try {
        const { orgId } = req.params;
        const body = req.body;
        const file = req.file;

        const settings = await editCompanySettings({orgId, body, file});
        invalidateSettingsCache(orgId);
        
        return res.status(200).json({ ok: true, settings});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ok: false, msg: 'Error al modificar la configuración.'});       
    }
}

export const patchSettingsInventory = async (req, res) => {
    try {
        const { orgId } = req.params;
        const body = req.body;

        const settings = await editInventorySettings(orgId, body);
        invalidateSettingsCache(orgId);
        return res.status(200).json({ ok: true, settings });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al editar la configuración del inventario.'});
    }
}

export const patchSettingsSales = async (req, res) => {
    try {
        const { orgId } = req.params;
        const body = req.body;

        const settings = await editSalesSettings(orgId, body);
        invalidateSettingsCache(orgId);

        return res.status(200).json({ ok: true, settings });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al editar la configuración del inventario.'});
    }
}