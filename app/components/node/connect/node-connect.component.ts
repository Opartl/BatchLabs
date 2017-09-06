import { Component, Input, OnInit } from "@angular/core";
import { autobind } from "core-decorators";
import { List } from "immutable";

import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { SidebarRef } from "app/components/base/sidebar";
import { Node, NodeAgentSku, NodeConnectionSettings, Pool } from "app/models";
import { AddNodeUserAttributes, NodeService, NodeUserService } from "app/services";
import { PoolUtils, SecureUtils } from "app/utils";
import "./node-connect.scss";

enum CredentialSource {
    Generated,
    Specified,
}

@Component({
    selector: "bl-node-connect",
    templateUrl: "node-connect.html",
})
export class NodeConnectComponent implements OnInit {
    public CredentialSource = CredentialSource;
    public credentialSource: CredentialSource = null;
    public credentials: AddNodeUserAttributes = null;
    public agentSkus: List<NodeAgentSku>;
    public windows = false;
    public linux = false;
    public hasIp = false;
    public commandValue: FormControl = new FormControl(null);
    public form: FormGroup;
    public creds;
    public lastCommand = "None";
    public cmds = [];

    /**
     * Base content for the rdp file(IP adress).
     * This is either downloaded from the api on CloudService nodes or generated from the ip/port on VMs nodes
     */
    public rdpContent: string;
    public connectionSettings: NodeConnectionSettings;

    @Input()
    public set pool(pool: Pool) {
        this._pool = pool;
        if (pool) {
            this.hasIp = Boolean(pool.virtualMachineConfiguration);
            this.linux = PoolUtils.isLinux(this.pool);
        }
    }
    public get pool() { return this._pool; }

    @Input()
    public node: Node;

    private _pool: Pool;

    constructor(
        public sidebarRef: SidebarRef<any>,
        private nodeUserService: NodeUserService,
        private nodeService: NodeService,
        public formBuilder: FormBuilder) {
            this.form = new FormGroup({});
    }

    public ngOnInit() {
        const data = this.nodeService.listNodeAgentSkus();
        data.fetchAll().subscribe(() => {
            data.items.first().subscribe((agentSkus) => {
                this.agentSkus = agentSkus;
                this.windows = PoolUtils.isWindows(this.pool, agentSkus);
            });
        });
        this._loadConnectionData();
        this.form = this.formBuilder.group({ command: this.commandValue });
    }

    @autobind()
    public generateCredentials() {
        const credentials = {
            name: SecureUtils.username(),
            password: SecureUtils.password(),
            isAdmin: true,
        };

        return this.addOrUpdateUser(credentials).do(() => {
            this.credentialSource = CredentialSource.Generated;
        });
    }

    @autobind()
    public addOrUpdateUser(credentials) {
        return this.nodeUserService.addOrUpdateUser(this.pool.id, this.node.id, credentials).do(() => {
            this.credentials = credentials;
            const { ip, port } = this.connectionSettings;
            this.creds = {
                host: ip,
                user: this.credentials.name,
                pass: this.credentials.password,
                port: port,
            };
        });
    }

    public get sshCommand() {
        if (!this.connectionSettings || !this.credentials) {
            return "N/A";
        }
        const { ip, port } = this.connectionSettings;
        return `ssh ${this.credentials.name}@${ip} -p ${port}`;
    }

    public runCommand() {
        let SSH = require("simple-ssh");
        let ssh = new SSH(this.creds);
        let cmd = String(this.commandValue.value);
        this.commandValue.reset();
        ssh.exec(cmd, {
            out: (stdout) => {
                this.cmds.push(cmd);
                this.cmds.push(String(stdout));
            },
        }).start();
    }

    @autobind()
    public specifyCredentials() {
        this.credentialSource = CredentialSource.Specified;
    }

    @autobind()
    public close() {
        this.sidebarRef.destroy();
    }

    /**
     * Load either the RDP file or the node connection settings depending if the VM is IAAS or PAAS
     */
    private _loadConnectionData() {
        if (PoolUtils.isPaas(this.pool)) {
            this.nodeService.getRemoteDesktop(this.pool.id, this.node.id).subscribe((rdp) => {
                this.rdpContent = rdp.content.toString();
            });
        } else {
            this.nodeService.getRemoteLoginSettings(this.pool.id, this.node.id).subscribe((connection) => {
                this.connectionSettings = connection;
            });
        }
    }
}
