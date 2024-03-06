import { mock, MockProxy } from "jest-mock-extended";

import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { CollectionId, OrganizationId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CollectionService } from "@bitwarden/common/vault/abstractions/collection.service";
import { FolderService } from "@bitwarden/common/vault/abstractions/folder/folder.service.abstraction";
import { CipherRepromptType } from "@bitwarden/common/vault/enums/cipher-reprompt-type";
import { CipherType } from "@bitwarden/common/vault/enums/cipher-type";
import { FieldType } from "@bitwarden/common/vault/enums/field-type.enum";
import { UriMatchType } from "@bitwarden/common/vault/enums/uri-match-type.enum";
import { CipherData } from "@bitwarden/common/vault/models/data/cipher.data";
import { CollectionData } from "@bitwarden/common/vault/models/data/collection.data";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { Collection } from "@bitwarden/common/vault/models/domain/collection";
import { CollectionView } from "@bitwarden/common/vault/models/view/collection.view";
import { FolderView } from "@bitwarden/common/vault/models/view/folder.view";

import { unencryptedOrgExport } from "../../spec/test-data/bitwarden-json/unencrypted-org.json";
import { BitwardenPasswordProtectedImporter } from "../importers/bitwarden/bitwarden-password-protected-importer";
import { Importer } from "../importers/importer";
import { ImportResult } from "../models/import-result";

import { ImportApiServiceAbstraction } from "./import-api.service.abstraction";
import { ImportService } from "./import.service";

const cipherData: CipherData = {
  id: "id",
  organizationId: "1234",
  folderId: "folderId",
  edit: true,
  viewPassword: true,
  organizationUseTotp: true,
  favorite: false,
  revisionDate: "2022-01-31T12:00:00.000Z",
  type: CipherType.Login,
  name: "EncryptedString",
  notes: "EncryptedString",
  creationDate: "2022-01-01T12:00:00.000Z",
  deletedDate: null,
  key: "EncKey",
  reprompt: CipherRepromptType.None,
  login: {
    uris: [{ uri: "EncryptedString", uriChecksum: "EncryptedString", match: UriMatchType.Domain }],
    username: "EncryptedString",
    password: "EncryptedString",
    passwordRevisionDate: "2022-01-31T12:00:00.000Z",
    totp: "EncryptedString",
    autofillOnPageLoad: false,
  },
  passwordHistory: [{ password: "EncryptedString", lastUsedDate: "2022-01-31T12:00:00.000Z" }],
  attachments: [
    {
      id: "a1",
      url: "url",
      size: "1100",
      sizeName: "1.1 KB",
      fileName: "file",
      key: "EncKey",
    },
    {
      id: "a2",
      url: "url",
      size: "1100",
      sizeName: "1.1 KB",
      fileName: "file",
      key: "EncKey",
    },
  ],
  fields: [
    {
      name: "EncryptedString",
      value: "EncryptedString",
      type: FieldType.Text,
      linkedId: null,
    },
    {
      name: "EncryptedString",
      value: "EncryptedString",
      type: FieldType.Hidden,
      linkedId: null,
    },
  ],
};

const collectionData: CollectionData = {
  id: "1234-1234" as CollectionId,
  organizationId: "1234" as OrganizationId,
  name: "collection123",
  readOnly: false,
  manage: true,
  externalId: "",
  hidePasswords: false,
};

describe("ImportService", () => {
  let importService: ImportService;
  let cipherService: MockProxy<CipherService>;
  let folderService: MockProxy<FolderService>;
  let importApiService: MockProxy<ImportApiServiceAbstraction>;
  let i18nService: MockProxy<I18nService>;
  let collectionService: MockProxy<CollectionService>;
  let cryptoService: MockProxy<CryptoService>;

  beforeEach(() => {
    cipherService = mock<CipherService>();
    folderService = mock<FolderService>();
    importApiService = mock<ImportApiServiceAbstraction>();
    i18nService = mock<I18nService>();
    collectionService = mock<CollectionService>();
    cryptoService = mock<CryptoService>();

    importService = new ImportService(
      cipherService,
      folderService,
      importApiService,
      i18nService,
      collectionService,
      cryptoService,
    );
  });

  describe("getImporterInstance", () => {
    describe("Get bitPasswordProtected importer", () => {
      let importer: Importer;
      const organizationId = Utils.newGuid();
      const password = Utils.newGuid();
      const promptForPassword_callback = async () => {
        return password;
      };

      beforeEach(() => {
        importer = importService.getImporter(
          "bitwardenpasswordprotected",
          promptForPassword_callback,
          organizationId,
        );
      });

      it("returns an instance of BitwardenPasswordProtectedImporter", () => {
        expect(importer).toBeInstanceOf(BitwardenPasswordProtectedImporter);
      });

      it("has the promptForPassword_callback set", async () => {
        // Cast to any to access private property. Note: assumes instance of BitwardenPasswordProtectedImporter
        expect((importer as any).promptForPassword_callback).not.toBeNull();
        expect(await (importer as any).promptForPassword_callback()).toEqual(password);
      });

      it("has the appropriate organization Id", () => {
        expect(importer.organizationId).toEqual(organizationId);
      });
    });
  });

  describe("setImportTarget", () => {
    const organizationId = Utils.newGuid();

    let importResult: ImportResult;

    beforeEach(() => {
      importResult = new ImportResult();
    });

    it("empty importTarget does nothing", async () => {
      await importService["setImportTarget"](importResult, null, "");
      expect(importResult.folders.length).toBe(0);
    });

    const mockImportTargetFolder = new FolderView();
    mockImportTargetFolder.id = "myImportTarget";
    mockImportTargetFolder.name = "myImportTarget";

    it("passing importTarget adds it to folders", async () => {
      folderService.getAllDecryptedFromState.mockReturnValue(
        Promise.resolve([mockImportTargetFolder]),
      );

      await importService["setImportTarget"](importResult, null, "myImportTarget");
      expect(importResult.folders.length).toBe(1);
      expect(importResult.folders[0].name).toBe("myImportTarget");
    });

    const mockFolder1 = new FolderView();
    mockFolder1.id = "folder1";
    mockFolder1.name = "folder1";

    const mockFolder2 = new FolderView();
    mockFolder2.id = "folder2";
    mockFolder2.name = "folder2";

    it("passing importTarget sets it as new root for all existing folders", async () => {
      folderService.getAllDecryptedFromState.mockResolvedValue([
        mockImportTargetFolder,
        mockFolder1,
        mockFolder2,
      ]);

      const myImportTarget = "myImportTarget";

      importResult.folders.push(mockFolder1);
      importResult.folders.push(mockFolder2);

      await importService["setImportTarget"](importResult, null, myImportTarget);
      expect(importResult.folders.length).toBe(3);
      expect(importResult.folders[0].name).toBe(myImportTarget);
      expect(importResult.folders[1].name).toBe(`${myImportTarget}/${mockFolder1.name}`);
      expect(importResult.folders[2].name).toBe(`${myImportTarget}/${mockFolder2.name}`);
    });

    const mockImportTargetCollection = new CollectionView();
    mockImportTargetCollection.id = "myImportTarget";
    mockImportTargetCollection.name = "myImportTarget";
    mockImportTargetCollection.organizationId = organizationId;

    const mockCollection1 = new CollectionView();
    mockCollection1.id = "collection1";
    mockCollection1.name = "collection1";
    mockCollection1.organizationId = organizationId;

    const mockCollection2 = new CollectionView();
    mockCollection1.id = "collection2";
    mockCollection1.name = "collection2";
    mockCollection1.organizationId = organizationId;

    it("passing importTarget adds it to collections", async () => {
      collectionService.getAllDecrypted.mockResolvedValue([
        mockImportTargetCollection,
        mockCollection1,
      ]);

      await importService["setImportTarget"](importResult, organizationId, "myImportTarget");
      expect(importResult.collections.length).toBe(1);
      expect(importResult.collections[0].name).toBe("myImportTarget");
    });

    it("passing importTarget sets it as new root for all existing collections", async () => {
      collectionService.getAllDecrypted.mockResolvedValue([
        mockImportTargetCollection,
        mockCollection1,
        mockCollection2,
      ]);

      const myImportTarget = "myImportTarget";

      importResult.collections.push(mockCollection1);
      importResult.collections.push(mockCollection2);

      await importService["setImportTarget"](importResult, organizationId, myImportTarget);
      expect(importResult.collections.length).toBe(3);
      expect(importResult.collections[0].name).toBe(myImportTarget);
      expect(importResult.collections[1].name).toBe(`${myImportTarget}/${mockCollection1.name}`);
      expect(importResult.collections[2].name).toBe(`${myImportTarget}/${mockCollection2.name}`);
    });

    it("if no targetCollection is found, does nothing", async () => {
      collectionService.getAllDecrypted.mockResolvedValue([mockCollection1, mockCollection2]);

      const myImportTarget = "myImportTarget";

      importResult.collections.push(mockImportTargetCollection);

      await importService["setImportTarget"](importResult, "123", myImportTarget);
      expect(importResult.collections.length).toBe(1);
      expect(importResult.collections[0].name).toBe("myImportTarget");
    });
  });

  describe("Import", () => {
    let importer: Importer;
    const organizationId = Utils.newGuid();
    const password = Utils.newGuid();
    const promptForPassword_callback = async () => {
      return password;
    };

    beforeEach(() => {
      importer = importService.getImporter(
        "bitwardenpasswordprotected",
        promptForPassword_callback,
        organizationId,
      );
    });

    it("Should work flawlessly", async () => {
      cipherService.encrypt.mockResolvedValue(new Cipher(cipherData));
      collectionService.encrypt.mockResolvedValue(new Collection(collectionData));

      await importService.import(importer, unencryptedOrgExport, "1234", null, true);
    });

    it("Should throw error building import data on null ciphers", async () => {
      cipherService.encrypt.mockResolvedValue(undefined);
      collectionService.encrypt.mockResolvedValue(new Collection(collectionData));

      await expect(
        importService.import(importer, unencryptedOrgExport, "1234", null, true),
      ).rejects.toThrow(
        "Unexpected error building import data: Cannot read properties of undefined (reading 'type')",
      );
    });

    it("Should throw error building import data on null collections", async () => {
      cipherService.encrypt.mockResolvedValue(new Cipher(cipherData));
      collectionService.encrypt.mockResolvedValue(undefined);

      await expect(
        importService.import(importer, unencryptedOrgExport, "1234", null, true),
      ).rejects.toThrow(
        "Unexpected error building import data: Cannot set properties of undefined (setting 'organizationId')",
      );
    });
  });
});
