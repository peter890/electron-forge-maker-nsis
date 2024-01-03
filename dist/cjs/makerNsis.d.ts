import MakerBase, { MakerOptions } from '@electron-forge/maker-base';
import { MakerNSISConfig } from './config';
export default class MakerNSIS extends MakerBase<MakerNSISConfig> {
    name: string;
    defaultPlatforms: string[];
    isSupportedOnCurrentPlatform(): boolean;
    codesign(options: MakerOptions, outPath: string): Promise<void>;
    /**
     * Maybe creates an app-update.yml, compatible with electron-updater
     */
    createAppUpdateYml(options: MakerOptions, outPath: string): Promise<void>;
    createChannelYml(options: MakerOptions, installerPath: string): Promise<string | undefined>;
    make(options: MakerOptions): Promise<string[]>;
}
