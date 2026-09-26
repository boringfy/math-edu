Pod::Spec.new do |s|
  s.name = 'DailyReminder'
  s.version = '1.0.0'
  s.summary = 'DailyReminder native integration for Have Fun Learning'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'Hashfront'
  s.homepage = 'https://math-edu.hashfront.com'
  s.source = { :git => 'https://github.com/hashfront/math-edu.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
