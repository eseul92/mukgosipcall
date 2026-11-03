package expo.modules.receiptocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

// 영수증 사진에서 글자를 기기 안(ML Kit 한국어 모델)에서 읽는다.
// 사진은 읽기만 하고 어디에도 보내거나 저장하지 않는다.
// 오류 메시지에 파일 경로나 인식된 글자를 넣지 않는다.
class ReceiptOcrModule : Module() {
  // 처음 인식할 때 만든다. 만든 적이 없으면 닫을 것도 없다.
  private var recognizer: TextRecognizer? = null

  private fun recognizer(): TextRecognizer =
    recognizer ?: TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
      .also { recognizer = it }

  override fun definition() = ModuleDefinition {
    Name("ReceiptOcr")

    // 사진 한 장을 읽어 줄 목록을 돌려준다. 블록 순서대로, 블록 안에서는 줄 순서대로.
    AsyncFunction("recognizeLines") { uriString: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject(CodedException("ERR_NO_CONTEXT", "앱 화면을 찾지 못했어요", null))
        return@AsyncFunction
      }

      val uri = if (uriString.contains("://")) Uri.parse(uriString) else Uri.fromFile(File(uriString))
      val image = try {
        InputImage.fromFilePath(context, uri)
      } catch (e: Exception) {
        promise.reject(CodedException("ERR_IMAGE", "사진을 열지 못했어요", null))
        return@AsyncFunction
      }

      recognizer().process(image)
        .addOnSuccessListener { text ->
          promise.resolve(text.textBlocks.flatMap { block -> block.lines.map { it.text } })
        }
        .addOnFailureListener {
          promise.reject(CodedException("ERR_RECOGNITION", "글자를 읽지 못했어요", null))
        }
    }

    OnDestroy {
      recognizer?.close()
      recognizer = null
    }
  }
}
