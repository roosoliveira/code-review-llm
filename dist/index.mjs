var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import 'dotenv/config';
import { Octokit } from 'octokit';
function getFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        const o = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const data = yield o.rest.repos.getContent({ owner: 'roosoliveira', repo: 'code-review-llm', path: '' });
        return data.data;
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield getFiles();
        console.log(files);
    });
}
run();
//# sourceMappingURL=index.mjs.map