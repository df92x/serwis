import Foundation

@MainActor
final class StreamStore: ObservableObject {
    @Published private(set) var streams: [StreamItem] = []
    @Published var selectedStream: StreamItem?
    @Published var lastError: String?

    private let storageKey = "saved_streams"
    private let parser = M3UParser()

    init() {
        loadStreams()
    }

    func addStream(title: String, url: URL, isLive: Bool = true) {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalTitle = trimmedTitle.isEmpty ? url.lastPathComponent : trimmedTitle

        guard !streams.contains(where: { $0.url == url }) else {
            selectedStream = streams.first(where: { $0.url == url })
            return
        }

        let item = StreamItem(title: finalTitle, url: url, isLive: isLive)
        streams.insert(item, at: 0)
        selectedStream = item
        persistStreams()
    }

    func importFromFile(url: URL) async {
        lastError = nil

        do {
            let imported = try parser.parse(fileURL: url)
            for stream in imported {
                if !streams.contains(where: { $0.url == stream.url }) {
                    streams.insert(stream, at: 0)
                }
            }
            selectedStream = imported.first ?? streams.first
            persistStreams()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func loadFromURL(_ url: URL) async {
        lastError = nil

        do {
            let imported = try await parser.parse(remoteURL: url)
            for stream in imported {
                if !streams.contains(where: { $0.url == stream.url }) {
                    streams.insert(stream, at: 0)
                }
            }
            selectedStream = imported.first ?? streams.first
            persistStreams()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func removeStream(_ stream: StreamItem) {
        streams.removeAll { $0.id == stream.id }
        if selectedStream?.id == stream.id {
            selectedStream = streams.first
        }
        persistStreams()
    }

    func select(_ stream: StreamItem) {
        selectedStream = stream
    }

    private func loadStreams() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([StreamItem].self, from: data) else {
            return
        }
        streams = decoded
        selectedStream = decoded.first
    }

    private func persistStreams() {
        guard let data = try? JSONEncoder().encode(streams) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}
