import SwiftUI
import UniformTypeIdentifiers

struct AddStreamSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var streamStore: StreamStore

    @State private var title = ""
    @State private var urlText = ""
    @State private var isLoading = false
    @State private var localError: String?
    @State private var showFileImporter = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Adres strumienia") {
                    TextField("https://example.com/live/stream.m3u8", text: $urlText)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    TextField("Nazwa (opcjonalnie)", text: $title)
                }

                Section {
                    Button {
                        Task { await addFromURL() }
                    } label: {
                        HStack {
                            if isLoading {
                                ProgressView()
                            }
                            Text("Dodaj i odtwórz")
                        }
                    }
                    .disabled(urlText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)

                    Button("Importuj plik .m3u8") {
                        showFileImporter = true
                    }
                }

                if let localError {
                    Section {
                        Text(localError)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle("Nowy strumień")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Anuluj") { dismiss() }
                }
            }
            .fileImporter(
                isPresented: $showFileImporter,
                allowedContentTypes: [.m3uPlaylist, .mpeg4Movie, .data],
                allowsMultipleSelection: false
            ) { result in
                Task { await handleFileImport(result) }
            }
        }
    }

    private func addFromURL() async {
        localError = nil
        isLoading = true
        defer { isLoading = false }

        let trimmed = urlText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), url.scheme != nil else {
            localError = "Wprowadź poprawny adres URL."
            return
        }

        if trimmed.lowercased().hasSuffix(".m3u8") || trimmed.lowercased().hasSuffix(".m3u") {
            await streamStore.loadFromURL(url)
            if streamStore.lastError == nil {
                dismiss()
            } else {
                localError = streamStore.lastError
            }
            return
        }

        streamStore.addStream(title: title, url: url)
        dismiss()
    }

    private func handleFileImport(_ result: Result<[URL], Error>) async {
        localError = nil

        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            guard url.startAccessingSecurityScopedResource() else {
                localError = "Brak dostępu do pliku."
                return
            }
            defer { url.stopAccessingSecurityScopedResource() }

            await streamStore.importFromFile(url: url)
            if streamStore.lastError == nil {
                dismiss()
            } else {
                localError = streamStore.lastError
            }
        case .failure(let error):
            localError = error.localizedDescription
        }
    }
}

extension UTType {
    static var m3uPlaylist: UTType {
        UTType(filenameExtension: "m3u8") ?? .mpeg4Movie
    }
}
