"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const maker_base_1 = __importDefault(require("@electron-forge/maker-base"));
const electron_windows_sign_1 = require("electron-windows-sign");
const app_builder_lib_1 = require("app-builder-lib");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const electron_updater_yaml_1 = require("electron-updater-yaml");
const log = (0, debug_1.default)('electron-forge:maker:nsis');
class MakerNSIS extends maker_base_1.default {
    constructor() {
        super(...arguments);
        this.name = 'nsis';
        this.defaultPlatforms = ['win32'];
    }
    isSupportedOnCurrentPlatform() {
        return process.platform === 'win32';
    }
    async codesign(options, outPath) {
        if (this.config.codesign) {
            try {
                await (0, electron_windows_sign_1.sign)(Object.assign(Object.assign({}, this.config.codesign), { appDirectory: outPath }));
            }
            catch (error) {
                console.error('Failed to codesign using electron-windows-sign. Check your config and the output for details!', error);
                throw error;
            }
            // Setup signing. If these variables are set, app-builder-lib will actually
            // codesign.
            if (!process.env.CSC_LINK) {
                log(`Setting process.env.CSC_LINK to ${this.config.codesign.certificateFile}`);
                process.env.CSC_LINK = this.config.codesign.certificateFile;
            }
            if (!process.env.CSC_KEY_PASSWORD) {
                log('Setting process.env.CSC_KEY_PASSWORD to the passed password');
                process.env.CSC_KEY_PASSWORD = this.config.codesign.certificatePassword;
            }
        }
        else {
            log('Skipping code signing, if you need it set \'config.codesign\'');
        }
    }
    /**
     * Maybe creates an app-update.yml, compatible with electron-updater
     */
    async createAppUpdateYml(options, outPath) {
        if (!this.config.updater)
            return;
        const ymlContents = await (0, electron_updater_yaml_1.getAppUpdateYml)({
            url: this.config.updater.url,
            name: options.appName,
            channel: this.config.updater.channel,
            updaterCacheDirName: this.config.updater.updaterCacheDirName,
            publisherName: this.config.updater.publisherName
        });
        log(`Writing app-update.yml to ${outPath}`, ymlContents);
        await fs_extra_1.default.writeFile(path_1.default.join(outPath, 'resources', 'app-update.yml'), ymlContents, 'utf8');
    }
    async createChannelYml(options, installerPath) {
        if (!this.config.updater)
            return;
        const channel = this.config.updater.channel || 'latest';
        const version = options.packageJSON.version;
        const channelFilePath = path_1.default.resolve(installerPath, `${channel}.yml`);
        const ymlContents = await (0, electron_updater_yaml_1.getChannelYml)({
            installerPath,
            version,
            platform: 'win32'
        });
        log(`Writing ${channel}.yml to ${installerPath}`, ymlContents);
        await fs_extra_1.default.writeFile(channelFilePath, ymlContents, 'utf8');
        return channelFilePath;
    }
    async make(options) {
        // Copy everything to a temporary location
        const { makeDir, targetArch } = options;
        const outPath = path_1.default.resolve(makeDir, `nsis/${targetArch}`);
        const tmpPath = path_1.default.resolve(makeDir, `nsis/${targetArch}-tmp`);
        const result = [];
        log(`Emptying directories: ${tmpPath}, ${outPath}`);
        await fs_extra_1.default.emptyDir(tmpPath);
        await fs_extra_1.default.emptyDir(outPath);
        log(`Copying contents of ${options.dir} to ${tmpPath}`);
        await fs_extra_1.default.copy(options.dir, tmpPath);
        // Codesign
        await this.codesign(options, tmpPath);
        // Updater: Create the app-update.yml that goes _into_ the
        // application package
        await this.createAppUpdateYml(options, tmpPath);
        // Actually make the NSIS
        log(`Calling app-builder-lib's buildForge() with ${tmpPath}`);
        const output = await (0, app_builder_lib_1.buildForge)({ dir: tmpPath }, { win: [`nsis:${options.targetArch}`] });
        // Move the output to the actual output folder, app-builder-lib might get it wrong
        log('Received output files', output);
        for (const file of output) {
            const filePath = path_1.default.resolve(outPath, path_1.default.basename(file));
            result.push(filePath);
            await fs_extra_1.default.move(file, filePath);
        }
        // Updater: Create the channel file that goes _next to_ the installer
        const channelFile = await this.createChannelYml(options, outPath);
        if (channelFile)
            result.push(channelFile);
        // Cleanup
        await fs_extra_1.default.remove(tmpPath);
        await fs_extra_1.default.remove(path_1.default.resolve(makeDir, 'nsis/make'));
        return result;
    }
}
exports.default = MakerNSIS;
//# sourceMappingURL=makerNsis.js.map