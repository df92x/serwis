import AVFoundation
import Combine
import Foundation

@MainActor
final class PlayerViewModel: ObservableObject {
    @Published private(set) var player: AVPlayer?
    @Published private(set) var isPlaying = false
    @Published private(set) var statusMessage: String?
    @Published private(set) var hasError = false

    private var statusObserver: NSKeyValueObservation?
    private var timeControlObserver: NSKeyValueObservation?
    private var endObserver: NSObjectProtocol?

    func load(stream: StreamItem) {
        stop()

        let playerItem = AVPlayerItem(url: stream.url)
        let newPlayer = AVPlayer(playerItem: playerItem)
        newPlayer.automaticallyWaitsToMinimizeStalling = true
        newPlayer.allowsExternalPlayback = true

        observe(player: newPlayer, item: playerItem)
        player = newPlayer
        statusMessage = stream.isLive ? "Łączenie z transmisją na żywo…" : "Ładowanie…"
        hasError = false
        newPlayer.play()
        isPlaying = true
    }

    func togglePlayback() {
        guard let player else { return }

        if isPlaying {
            player.pause()
            isPlaying = false
        } else {
            player.play()
            isPlaying = true
        }
    }

    func stop() {
        statusObserver?.invalidate()
        timeControlObserver?.invalidate()

        if let endObserver {
            NotificationCenter.default.removeObserver(endObserver)
            self.endObserver = nil
        }

        player?.pause()
        player?.replaceCurrentItem(with: nil)
        player = nil
        isPlaying = false
        statusMessage = nil
        hasError = false
    }

    private func observe(player: AVPlayer, item: AVPlayerItem) {
        statusObserver = item.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
            Task { @MainActor in
                switch item.status {
                case .readyToPlay:
                    self?.statusMessage = nil
                    self?.hasError = false
                case .failed:
                    self?.statusMessage = item.error?.localizedDescription ?? "Nie udało się odtworzyć strumienia."
                    self?.hasError = true
                    self?.isPlaying = false
                default:
                    break
                }
            }
        }

        timeControlObserver = player.observe(\.timeControlStatus, options: [.initial, .new]) { [weak self] player, _ in
            Task { @MainActor in
                self?.isPlaying = player.timeControlStatus == .playing
            }
        }

        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemFailedToPlayToEndTime,
            object: item,
            queue: .main
        ) { [weak self] notification in
            let error = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error
            Task { @MainActor in
                self?.statusMessage = error?.localizedDescription ?? "Odtwarzanie zostało przerwane."
                self?.hasError = true
                self?.isPlaying = false
            }
        }
    }
}
